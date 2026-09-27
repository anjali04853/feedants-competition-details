import { Types } from 'mongoose';
import { env } from '../config/env';
import { CompetitionModel } from '../models/Competition';
import { RegistrationModel, Registration, RegistrationStatus } from '../models/Registration';
import { UserModel } from '../models/User';
import { getPhase } from '../domain/lifecycle';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { paymentGateway } from './payment.service';
import { toLifecycleInput } from './competition.service';

/*
 * Concurrency model
 * -----------------
 * Invariant: Competition.bookedCount === number of registrations whose status is
 * 'pending_payment' or 'confirmed'.
 *
 *  - A seat is taken with ONE atomic conditional update:
 *        updateOne({ _id, bookedCount < capacity, registration open }, { $inc: { bookedCount: 1 } })
 *    MongoDB applies single-document updates atomically, so thousands of
 *    concurrent requests can never push bookedCount past capacity.
 *  - A seat is released only by the request that moves a registration OUT of
 *    'pending_payment' (to expired/cancelled). That transition is itself a
 *    conditional findOneAndUpdate on the current status, so exactly one caller
 *    wins and the seat is released exactly once.
 *  - The unique (competition, user) index stops duplicate registrations from
 *    double taps, retries and multiple devices; the loser rolls its seat back.
 *
 * None of this needs multi-document transactions, so it works on a standalone
 * mongod as well as on replica sets / Atlas.
 */

const holdMs = () => env.SEAT_HOLD_MINUTES * 60 * 1000;

const isDuplicateKey = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;

async function reserveSeat(competitionId: Types.ObjectId, now: Date, { requireRegistrationOpen = true } = {}) {
  const filter: Record<string, unknown> = {
    _id: competitionId,
    status: 'published',
    $expr: { $lt: ['$bookedCount', '$capacity'] },
  };
  if (requireRegistrationOpen) {
    filter['schedule.registrationOpensAt'] = { $lte: now };
    filter['schedule.registrationClosesAt'] = { $gt: now };
  }
  const res = await CompetitionModel.updateOne(filter, { $inc: { bookedCount: 1 } });
  return res.modifiedCount === 1;
}

async function releaseSeat(competitionId: Types.ObjectId) {
  await CompetitionModel.updateOne(
    { _id: competitionId, bookedCount: { $gt: 0 } },
    { $inc: { bookedCount: -1 } },
  );
}

/**
 * Moves an expired hold to 'expired' and frees its seat. Safe to call from any
 * number of processes concurrently: only one of them performs the transition.
 */
export async function expireHold(registrationId: Types.ObjectId, now: Date): Promise<boolean> {
  const expired = await RegistrationModel.findOneAndUpdate(
    { _id: registrationId, status: 'pending_payment', holdExpiresAt: { $lte: now } },
    { $set: { status: 'expired' } },
    { returnDocument: 'after' },
  ).lean();
  if (expired) await releaseSeat(expired.competition);
  return !!expired;
}

/** Background sweep: releases every hold that has lapsed. */
export async function releaseExpiredHolds(now: Date, batchSize = 500): Promise<number> {
  const stale = await RegistrationModel.find(
    { status: 'pending_payment', holdExpiresAt: { $lte: now } },
    { _id: 1 },
  )
    .limit(batchSize)
    .lean();
  let released = 0;
  for (const r of stale) if (await expireHold(r._id, now)) released++;
  if (released) logger.info({ released }, 'Released expired seat holds');
  return released;
}

async function resolveReferrer(referralCode: string | undefined, userId: Types.ObjectId) {
  if (!referralCode) return undefined;
  const referrer = await UserModel.findOne({ referralCode: referralCode.toUpperCase() }, { _id: 1 }).lean();
  if (!referrer) throw new AppError(400, 'INVALID_REFERRAL', 'Referral code is not valid');
  if (referrer._id.equals(userId)) throw new AppError(400, 'INVALID_REFERRAL', 'You cannot use your own referral code');
  return referrer._id;
}

export interface RegisterResult {
  registration: Registration;
  /** false when an existing active registration/hold was returned (idempotent retry). */
  created: boolean;
}

export async function register(
  competitionId: Types.ObjectId,
  userId: Types.ObjectId,
  opts: { referralCode?: string },
  now: Date,
): Promise<RegisterResult> {
  const competition = await CompetitionModel.findById(competitionId).lean();
  if (!competition || competition.status === 'draft') throw AppError.notFound('Competition');

  const phase = getPhase(toLifecycleInput(competition), now);
  if (phase === 'cancelled') throw AppError.conflict('COMPETITION_NOT_AVAILABLE', 'This competition has been cancelled');
  if (phase === 'upcoming') throw AppError.conflict('REGISTRATION_NOT_OPEN', 'Registration has not opened yet');
  if (phase !== 'registration_open') throw AppError.conflict('REGISTRATION_CLOSED', 'Registration is closed');

  const referredBy = await resolveReferrer(opts.referralCode, userId);

  const existing = await RegistrationModel.findOne({ competition: competitionId, user: userId }).lean();
  if (existing?.status === 'confirmed') {
    throw AppError.conflict('ALREADY_REGISTERED', 'You are already registered for this competition');
  }
  if (existing?.status === 'pending_payment') {
    if (existing.holdExpiresAt && existing.holdExpiresAt > now) {
      return { registration: existing, created: false }; // retry of an in-flight checkout
    }
    await expireHold(existing._id, now); // lapsed but not yet swept: free its seat first
  }

  if (!(await reserveSeat(competitionId, now))) {
    const fresh = await CompetitionModel.findById(competitionId).lean();
    if (fresh && getPhase(toLifecycleInput(fresh), now) !== 'registration_open') {
      throw AppError.conflict('REGISTRATION_CLOSED', 'Registration is closed');
    }
    throw AppError.conflict('SOLD_OUT', 'All spots have been booked');
  }

  // From here on we own a seat; any failure must give it back.
  try {
    const isFree = competition.entryFee === 0;
    const order = isFree
      ? null
      : await paymentGateway.createOrder({
          amount: competition.entryFee,
          currency: competition.currency ?? 'INR',
          receipt: `${competitionId}:${userId}`,
        });

    const fields = {
      status: (isFree ? 'confirmed' : 'pending_payment') as RegistrationStatus,
      amount: competition.entryFee,
      currency: competition.currency ?? 'INR',
      holdExpiresAt: isFree ? null : new Date(now.getTime() + holdMs()),
      confirmedAt: isFree ? now : null,
      referredBy: referredBy ?? null,
      payment: order ? { provider: order.provider, orderId: order.orderId } : null,
    };

    if (existing) {
      // Optimistic transition from the terminal state we observed; if another
      // request re-activated it first, we lose and hand the seat back.
      const reactivated = await RegistrationModel.findOneAndUpdate(
        { _id: existing._id, status: { $in: ['expired', 'cancelled'] } },
        { $set: fields },
        { returnDocument: 'after' },
      ).lean();
      if (reactivated) return { registration: reactivated, created: true };
      await releaseSeat(competitionId);
      return currentRegistrationOrThrow(competitionId, userId);
    }

    const created = await RegistrationModel.create({ competition: competitionId, user: userId, ...fields });
    return { registration: created.toObject(), created: true };
  } catch (err) {
    await releaseSeat(competitionId);
    if (isDuplicateKey(err)) return currentRegistrationOrThrow(competitionId, userId);
    throw err;
  }
}

/** Resolves the outcome for the request that lost a same-user race. */
async function currentRegistrationOrThrow(competitionId: Types.ObjectId, userId: Types.ObjectId): Promise<RegisterResult> {
  const current = await RegistrationModel.findOne({ competition: competitionId, user: userId }).lean();
  if (!current) throw new AppError(500, 'INTERNAL_ERROR', 'Registration state could not be resolved');
  if (current.status === 'confirmed') {
    throw AppError.conflict('ALREADY_REGISTERED', 'You are already registered for this competition');
  }
  return { registration: current, created: false };
}

export async function confirmPayment(
  registrationId: Types.ObjectId,
  userId: Types.ObjectId,
  input: { orderId: string; paymentId: string; signature: string },
  now: Date,
): Promise<Registration> {
  const reg = await RegistrationModel.findOne({ _id: registrationId, user: userId }).lean();
  if (!reg) throw AppError.notFound('Registration');

  if (reg.status === 'confirmed') {
    // Idempotent: replaying the same successful payment is a no-op.
    if (reg.payment?.paymentId === input.paymentId) return reg;
    throw AppError.conflict('ALREADY_REGISTERED', 'This registration is already paid');
  }
  if (reg.payment?.orderId !== input.orderId) {
    throw new AppError(400, 'INVALID_PAYMENT', 'Payment does not belong to this registration');
  }
  if (!paymentGateway.verifySignature(input.orderId, input.paymentId, input.signature)) {
    throw new AppError(400, 'INVALID_PAYMENT', 'Payment signature verification failed');
  }

  const paidFields = {
    status: 'confirmed',
    confirmedAt: now,
    'payment.paymentId': input.paymentId,
    'payment.paidAt': now,
  };

  // Happy path: the seat is still held (even if the hold just lapsed, it has
  // not been released while status is pending_payment).
  const confirmed = await RegistrationModel.findOneAndUpdate(
    { _id: reg._id, status: 'pending_payment', 'payment.orderId': input.orderId },
    { $set: paidFields, $unset: { holdExpiresAt: 1 } },
    { returnDocument: 'after' },
  ).lean();
  if (confirmed) return confirmed;

  // The hold was released before the payment arrived. The user has paid, so
  // try to honour it with any free seat; otherwise flag the payment for refund.
  const latest = await RegistrationModel.findById(reg._id).lean();
  if (latest?.status === 'confirmed') return latest;

  const competition = await CompetitionModel.findById(reg.competition).lean();
  const stillRunning = competition && ['registration_open', 'in_progress'].includes(getPhase(toLifecycleInput(competition), now));
  if (stillRunning && (await reserveSeat(reg.competition, now, { requireRegistrationOpen: false }))) {
    const revived = await RegistrationModel.findOneAndUpdate(
      { _id: reg._id, status: { $in: ['expired', 'cancelled'] }, 'payment.orderId': input.orderId },
      { $set: paidFields, $unset: { holdExpiresAt: 1 } },
      { returnDocument: 'after' },
    ).lean();
    if (revived) return revived;
    await releaseSeat(reg.competition);
  }

  await RegistrationModel.updateOne(
    { _id: reg._id, status: { $ne: 'confirmed' } },
    { $set: { 'payment.paymentId': input.paymentId, 'payment.paidAt': now, 'payment.refundStatus': 'pending' } },
  );
  logger.warn({ registrationId: reg._id }, 'Payment received after hold expired with no seats left; refund queued');
  throw AppError.conflict(
    'HOLD_EXPIRED',
    'Your seat reservation expired and the competition is now full. Your payment will be refunded.',
  );
}

/** User abandoned checkout: release the held seat immediately. */
export async function cancelHold(registrationId: Types.ObjectId, userId: Types.ObjectId): Promise<Registration> {
  const cancelled = await RegistrationModel.findOneAndUpdate(
    { _id: registrationId, user: userId, status: 'pending_payment' },
    { $set: { status: 'cancelled' }, $unset: { holdExpiresAt: 1 } },
    { returnDocument: 'after' },
  ).lean();
  if (cancelled) {
    await releaseSeat(cancelled.competition);
    return cancelled;
  }
  const reg = await RegistrationModel.findOne({ _id: registrationId, user: userId }).lean();
  if (!reg) throw AppError.notFound('Registration');
  if (reg.status === 'confirmed') {
    throw AppError.conflict('ALREADY_REGISTERED', 'Paid registrations cannot be cancelled here; see the refund policy');
  }
  return reg; // already expired/cancelled: idempotent
}
