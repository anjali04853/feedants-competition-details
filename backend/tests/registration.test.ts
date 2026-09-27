import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, competitionBySlug, createUsers, resetClock, seed, startDb, stopDb, tokenFor, travelTo } from './helpers';
import { CompetitionModel } from '../src/models/Competition';
import { RegistrationModel } from '../src/models/Registration';
import { releaseExpiredHolds } from '../src/services/registration.service';
import { mockGateway } from '../src/services/payment.service';

const CLASSICAL = '/api/v1/competitions/feedants-classical-dance';

beforeAll(startDb);
afterAll(stopDb);

let users: Awaited<ReturnType<typeof seed>>['users'];
beforeEach(async () => {
  resetClock();
  ({ users } = await seed());
});

async function seatInvariantHolds(slug: string) {
  const c = await competitionBySlug(slug);
  const holding = await RegistrationModel.countDocuments({
    competition: c._id,
    status: { $in: ['pending_payment', 'confirmed'] },
  });
  expect(c.bookedCount).toBe(holding);
  expect(c.bookedCount).toBeLessThanOrEqual(c.capacity);
  return c;
}

async function registerAndPay(token: string, path = CLASSICAL) {
  const reg = await api().post(`${path}/registrations`).set('Authorization', `Bearer ${token}`).send({});
  const { orderId } = reg.body.data.order;
  const payment = mockGateway.simulateCheckout(orderId);
  return api()
    .post(`/api/v1/registrations/${reg.body.data.id}/payment/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ orderId, ...payment });
}

describe('concurrent registration', () => {
  it('never oversells: 60 users racing for 19 remaining seats', async () => {
    const racers = await createUsers(60);
    const results = await Promise.all(
      racers.map((u) => api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${u.token}`).send({})),
    );

    const won = results.filter((r) => r.status === 201);
    const soldOut = results.filter((r) => r.status === 409 && r.body.error.code === 'SOLD_OUT');
    expect(won).toHaveLength(19);
    expect(soldOut).toHaveLength(41);

    const c = await seatInvariantHolds('feedants-classical-dance');
    expect(c.bookedCount).toBe(20);
  });

  it('is idempotent for the same user double-tapping from several devices', async () => {
    const [u] = await createUsers(1);
    const results = await Promise.all(
      Array.from({ length: 15 }, () =>
        api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${u.token}`).send({}),
      ),
    );
    expect(results.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
    const c = await seatInvariantHolds('feedants-classical-dance');
    expect(c.bookedCount).toBe(2); // Priya (seeded) + this user
  });

  it('rejects registration for an already-confirmed participant', async () => {
    const res = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${tokenFor(users[0]._id)}`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REGISTERED');
  });
});

describe('payment and seat holds', () => {
  it('confirms a registration with a valid signature and rejects forged ones', async () => {
    const token = tokenFor(users[1]._id);
    const reg = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${token}`).send({});
    expect(reg.status).toBe(201);
    expect(reg.body.data.status).toBe('pending_payment');

    const forged = await api()
      .post(`/api/v1/registrations/${reg.body.data.id}/payment/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: reg.body.data.order.orderId, paymentId: 'pay_fake', signature: 'a'.repeat(64) });
    expect(forged.status).toBe(400);
    expect(forged.body.error.code).toBe('INVALID_PAYMENT');

    const { orderId } = reg.body.data.order;
    const payment = mockGateway.simulateCheckout(orderId);
    const confirmed = await api()
      .post(`/api/v1/registrations/${reg.body.data.id}/payment/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, ...payment });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('confirmed');

    const me = await api().get(`${CLASSICAL}/me`).set('Authorization', `Bearer ${token}`);
    expect(me.body.data.status).toBe('registered');
    expect(me.body.data.cta.action).toBe('upload_submission');
  });

  it("prevents a user from confirming someone else's registration", async () => {
    const reg = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${tokenFor(users[1]._id)}`).send({});
    const { orderId } = reg.body.data.order;
    const res = await api()
      .post(`/api/v1/registrations/${reg.body.data.id}/payment/confirm`)
      .set('Authorization', `Bearer ${tokenFor(users[2]._id)}`)
      .send({ orderId, ...mockGateway.simulateCheckout(orderId) });
    expect(res.status).toBe(404);
  });

  it('releases expired holds exactly once, even with concurrent sweepers', async () => {
    const racers = await createUsers(5);
    await Promise.all(racers.map((u) => api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${u.token}`).send({})));
    expect((await competitionBySlug('feedants-classical-dance')).bookedCount).toBe(6);

    const later = new Date(Date.now() + 11 * 60_000);
    const released = await Promise.all([releaseExpiredHolds(later), releaseExpiredHolds(later), releaseExpiredHolds(later)]);
    expect(released.reduce((a, b) => a + b, 0)).toBe(5);

    const c = await seatInvariantHolds('feedants-classical-dance');
    expect(c.bookedCount).toBe(1);
  });

  it('honours a late payment if a seat is still free, and queues a refund if sold out', async () => {
    // Fill the competition: 19 holds, one of them ours.
    const racers = await createUsers(19);
    const regs = await Promise.all(
      racers.map((u) => api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${u.token}`).send({})),
    );
    const mine = regs[0].body.data;

    // Our hold lapses and is swept; someone else takes the freed seat.
    const later = new Date(Date.now() + 11 * 60_000);
    await RegistrationModel.updateMany({ _id: { $ne: mine.id }, status: 'pending_payment' }, { $set: { holdExpiresAt: new Date(later.getTime() + 60 * 60_000) } });
    await releaseExpiredHolds(later);
    const [latecomer] = await createUsers(1, 'late');
    expect((await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${latecomer.token}`).send({})).status).toBe(201);

    travelTo(later);
    const payment = mockGateway.simulateCheckout(mine.order.orderId);
    const res = await api()
      .post(`/api/v1/registrations/${mine.id}/payment/confirm`)
      .set('Authorization', `Bearer ${racers[0].token}`)
      .send({ orderId: mine.order.orderId, ...payment });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HOLD_EXPIRED');
    const stored = await RegistrationModel.findById(mine.id).lean();
    expect(stored?.payment?.refundStatus).toBe('pending');
    await seatInvariantHolds('feedants-classical-dance');
  });

  it('cancelling a hold frees the seat immediately', async () => {
    const token = tokenFor(users[3]._id);
    const reg = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${token}`).send({});
    expect((await competitionBySlug('feedants-classical-dance')).bookedCount).toBe(2);
    const res = await api().post(`/api/v1/registrations/${reg.body.data.id}/cancel`).set('Authorization', `Bearer ${token}`);
    expect(res.body.data.status).toBe('cancelled');
    const c = await seatInvariantHolds('feedants-classical-dance');
    expect(c.bookedCount).toBe(1);

    // ...and the user can register again afterwards.
    const again = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${token}`).send({});
    expect(again.status).toBe(201);
    expect(again.body.data.id).toBe(reg.body.data.id);
  });
});

describe('lifecycle enforcement', () => {
  it('rejects registration outside the window and on cancelled competitions', async () => {
    const token = tokenFor(users[0]._id);
    const upcoming = await api().post('/api/v1/competitions/feedants-singing-star/registrations').set('Authorization', `Bearer ${token}`).send({});
    expect(upcoming.body.error.code).toBe('REGISTRATION_NOT_OPEN');

    const cancelled = await api().post('/api/v1/competitions/feedants-standup-night/registrations').set('Authorization', `Bearer ${token}`).send({});
    expect(cancelled.body.error.code).toBe('COMPETITION_NOT_AVAILABLE');

    const c = await competitionBySlug('feedants-classical-dance');
    travelTo(new Date(c.schedule.registrationClosesAt.getTime() + 1000));
    const closed = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${tokenFor(users[1]._id)}`).send({});
    expect(closed.body.error.code).toBe('REGISTRATION_CLOSED');
  });

  it('reports sold out for a full competition', async () => {
    const res = await api().post('/api/v1/competitions/feedants-bollywood-beats/registrations').set('Authorization', `Bearer ${tokenFor(users[0]._id)}`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SOLD_OUT');
  });

  it('confirms free competitions immediately without payment', async () => {
    const res = await api().post('/api/v1/competitions/feedants-sketch-sprint/registrations').set('Authorization', `Bearer ${tokenFor(users[1]._id)}`).send({});
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'confirmed', order: null });
  });

  it('validates referral codes', async () => {
    const own = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${tokenFor(users[1]._id)}`).send({ referralCode: 'ROHAN10' });
    expect(own.body.error.code).toBe('INVALID_REFERRAL');
    const unknown = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${tokenFor(users[1]._id)}`).send({ referralCode: 'NOPE999' });
    expect(unknown.body.error.code).toBe('INVALID_REFERRAL');
    const ok = await api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${tokenFor(users[1]._id)}`).send({ referralCode: 'referral123' });
    expect(ok.status).toBe(201);
    const stored = await RegistrationModel.findById(ok.body.data.id).lean();
    expect(String(stored?.referredBy)).toBe(String(users[0]._id));
  });
});

describe('submissions', () => {
  const video = Buffer.alloc(2048, 1);

  it('only confirmed participants can upload, and can replace until the deadline', async () => {
    const outsider = await api().post(`${CLASSICAL}/submission`).set('Authorization', `Bearer ${tokenFor(users[1]._id)}`)
      .attach('file', video, { filename: 'a.mp4', contentType: 'video/mp4' });
    expect(outsider.status).toBe(403);
    expect(outsider.body.error.code).toBe('NOT_REGISTERED');

    const token = tokenFor(users[0]._id);
    const first = await api().post(`${CLASSICAL}/submission`).set('Authorization', `Bearer ${token}`)
      .attach('file', video, { filename: 'a.mp4', contentType: 'video/mp4' });
    expect(first.status).toBe(201);
    const second = await api().post(`${CLASSICAL}/submission`).set('Authorization', `Bearer ${token}`)
      .attach('file', video, { filename: 'b.mp4', contentType: 'video/mp4' });
    expect(second.status).toBe(200);
    expect(second.body.data.revision).toBe(2);

    const c = await competitionBySlug('feedants-classical-dance');
    travelTo(new Date(c.schedule.submissionEndsAt.getTime() + 1000));
    const late = await api().post(`${CLASSICAL}/submission`).set('Authorization', `Bearer ${token}`)
      .attach('file', video, { filename: 'c.mp4', contentType: 'video/mp4' });
    expect(late.body.error.code).toBe('SUBMISSION_CLOSED');
  });

  it('rejects non-video files', async () => {
    const res = await api().post(`${CLASSICAL}/submission`).set('Authorization', `Bearer ${tokenFor(users[0]._id)}`)
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE');
  });
});

describe('read APIs', () => {
  it('serves localized public details with server time', async () => {
    const res = await api().get(`${CLASSICAL}?lang=hi`);
    expect(res.status).toBe(200);
    expect(res.body.meta.serverTime).toBeTruthy();
    expect(res.body.data.title).toBe('फीडएंट्स शास्त्रीय नृत्य');
    expect(res.body.data.spots).toEqual({ capacity: 20, booked: 1, remaining: 19 });
    expect(res.headers['cache-control']).toContain('public');
  });

  it('hides results until the result date', async () => {
    const res = await api().get('/api/v1/competitions/feedants-poetry-slam');
    expect(res.body.data.results).toHaveLength(3);
    const open = await api().get(CLASSICAL);
    expect(open.body.data.results).toHaveLength(0);
  });

  it('requires auth for viewer state and returns a consistent error shape', async () => {
    const res = await api().get(`${CLASSICAL}/me`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: expect.any(String) } });
  });

  it('keeps bookedCount in sync after a mix of operations', async () => {
    const racers = await createUsers(8);
    await Promise.all(racers.slice(0, 4).map((u) => registerAndPay(u.token)));
    await Promise.all(racers.slice(4).map((u) => api().post(`${CLASSICAL}/registrations`).set('Authorization', `Bearer ${u.token}`).send({})));
    await releaseExpiredHolds(new Date(Date.now() + 11 * 60_000));
    const c = await seatInvariantHolds('feedants-classical-dance');
    expect(c.bookedCount).toBe(5);
    expect(await CompetitionModel.countDocuments()).toBe(6);
  });
});
