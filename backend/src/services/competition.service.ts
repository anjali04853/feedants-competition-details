import mongoose, { Types } from 'mongoose';
import { env } from '../config/env';
import { Competition, CompetitionModel } from '../models/Competition';
import { RegistrationModel } from '../models/Registration';
import { SubmissionModel } from '../models/Submission';
import { UserModel } from '../models/User';
import { Lang, localize } from '../models/localized';
import {
  LifecycleInput,
  getCountdown,
  getCta,
  getNextTransitionAt,
  getPhase,
  getViewerStatus,
  isRegistrationOpen,
  isSubmissionOpen,
  remainingSpots,
} from '../domain/lifecycle';
import { AppError } from '../utils/AppError';
import { publicFileUrl } from './storage.service';

type CompetitionLean = Omit<Competition, never>;

export function toLifecycleInput(c: CompetitionLean): LifecycleInput {
  return {
    status: c.status as LifecycleInput['status'],
    schedule: c.schedule,
    capacity: c.capacity,
    bookedCount: c.bookedCount,
    hasResults: (c.results?.length ?? 0) > 0,
  };
}

/** Accepts either an ObjectId or a slug, so deep links can be human readable. */
export async function findPublishedCompetition(idOrSlug: string): Promise<CompetitionLean> {
  const query = mongoose.isValidObjectId(idOrSlug) && /^[a-f\d]{24}$/i.test(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug.toLowerCase() };
  const competition = await CompetitionModel.findOne({ ...query, status: { $ne: 'draft' } }).lean();
  if (!competition) throw AppError.notFound('Competition');
  return competition;
}

function spots(c: CompetitionLean) {
  return { capacity: c.capacity, booked: c.bookedCount, remaining: remainingSpots(c) };
}

/** Public, viewer-independent representation. Safe to cache at the CDN for a few seconds. */
export function toCompetitionDto(c: CompetitionLean, lang: Lang, now: Date) {
  const lc = toLifecycleInput(c);
  const phase = getPhase(lc, now);
  return {
    id: String(c._id),
    slug: c.slug,
    title: localize(c.title, lang),
    tags: c.tags.map((tag) => localize(tag, lang)),
    certificateForWinners: c.certificateForWinners,
    currency: c.currency,
    prizePool: c.prizePool,
    entryFee: c.entryFee,
    spots: spots(c),
    judge: {
      name: c.judge.name,
      title: localize(c.judge.title, lang),
      experienceYears: c.judge.experienceYears ?? null,
      avatarUrl: c.judge.avatarUrl ?? null,
      introVideoUrl: c.judge.introVideoUrl ?? null,
    },
    schedule: c.schedule,
    status: c.status,
    phase,
    isRegistrationOpen: isRegistrationOpen(lc, now),
    isSubmissionOpen: isSubmissionOpen(lc, now),
    countdown: getCountdown(lc, now),
    rewards: [...c.rewards].sort((a, b) => a.position - b.position),
    previousWinners: c.previousWinners.map((w) => ({
      id: String(w._id),
      name: w.name,
      position: w.position,
      thumbnailUrl: w.thumbnailUrl ?? null,
      videoUrl: w.videoUrl ?? null,
      edition: w.edition ?? null,
    })),
    about: localize(c.about, lang),
    judgingParameters: c.judgingParameters.map((p) => ({ title: localize(p.title, lang), weight: p.weight ?? null })),
    rules: c.rules.map((r) => localize(r, lang)),
    disclaimer: c.disclaimer ? localize(c.disclaimer, lang) : null,
    prizeInfoVideoUrl: c.prizeInfoVideoUrl ?? null,
    referralRewardPerSignup: c.referralRewardPerSignup,
    // Results are only revealed once the result date has passed.
    results: phase === 'completed' ? [...c.results].sort((a, b) => a.position - b.position).map((r) => ({
      position: r.position,
      name: r.name,
      amount: r.amount,
    })) : [],
    nextTransitionAt: getNextTransitionAt(c.schedule, now),
    updatedAt: c.updatedAt,
  };
}

export type CompetitionDto = ReturnType<typeof toCompetitionDto>;

/** Lightweight card representation for the competitions list. */
export function toCompetitionSummaryDto(c: CompetitionLean, lang: Lang, now: Date) {
  const lc = toLifecycleInput(c);
  return {
    id: String(c._id),
    slug: c.slug,
    title: localize(c.title, lang),
    tags: c.tags.map((tag) => localize(tag, lang)),
    prizePool: c.prizePool,
    entryFee: c.entryFee,
    currency: c.currency,
    spots: spots(c),
    phase: getPhase(lc, now),
    countdown: getCountdown(lc, now),
    judgeName: c.judge.name,
  };
}

export async function listCompetitions(lang: Lang, now: Date, { limit = 20 } = {}) {
  const docs = await CompetitionModel.find({ status: { $in: ['published', 'cancelled'] } })
    .sort({ 'schedule.registrationClosesAt': -1 })
    .limit(limit)
    .lean();
  return docs.map((c) => toCompetitionSummaryDto(c, lang, now));
}

/** Everything that depends on who is looking at the screen. */
export async function getViewerState(
  competitionIdOrSlug: string,
  userId: Types.ObjectId,
  now: Date,
  requestBaseUrl: string,
) {
  const competition = await findPublishedCompetition(competitionIdOrSlug);
  const [registration, submission, user] = await Promise.all([
    RegistrationModel.findOne({ competition: competition._id, user: userId }).lean(),
    SubmissionModel.findOne({ competition: competition._id, user: userId }).lean(),
    UserModel.findById(userId, { referralCode: 1 }).lean(),
  ]);

  const viewer = {
    registration: registration
      ? { status: registration.status, holdExpiresAt: registration.holdExpiresAt ?? null }
      : null,
    hasSubmission: !!submission,
  };

  return {
    competitionId: String(competition._id),
    status: getViewerStatus(viewer, now),
    registration: registration && {
      id: String(registration._id),
      status: registration.status,
      amount: registration.amount,
      currency: registration.currency,
      holdExpiresAt: registration.holdExpiresAt ?? null,
      confirmedAt: registration.confirmedAt ?? null,
      orderId: registration.status === 'pending_payment' ? registration.payment?.orderId ?? null : null,
      refundPending: registration.payment?.refundStatus === 'pending',
    },
    submission: submission && {
      id: String(submission._id),
      url: publicFileUrl(submission.file.storageKey, requestBaseUrl),
      originalName: submission.file.originalName ?? null,
      size: submission.file.size,
      revision: submission.revision,
      submittedAt: submission.submittedAt,
    },
    cta: getCta(toLifecycleInput(competition), viewer, now),
    referral: user && {
      code: user.referralCode,
      link: `${env.REFERRAL_BASE_URL.replace(/\/$/, '')}/${user.referralCode}`,
      rewardPerSignup: competition.referralRewardPerSignup,
    },
    nextTransitionAt: getNextTransitionAt(competition.schedule, now, [registration?.holdExpiresAt]),
  };
}
