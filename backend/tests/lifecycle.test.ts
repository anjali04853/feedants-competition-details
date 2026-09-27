import { describe, expect, it } from 'vitest';
import { getCountdown, getCta, getNextTransitionAt, getPhase, LifecycleInput, ViewerInput } from '../src/domain/lifecycle';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const now = new Date('2026-08-01T00:00:00Z');
const at = (ms: number) => new Date(now.getTime() + ms);

function comp(over: Partial<LifecycleInput> = {}): LifecycleInput {
  return {
    status: 'published',
    capacity: 20,
    bookedCount: 1,
    hasResults: false,
    schedule: {
      registrationOpensAt: at(-5 * DAY),
      registrationClosesAt: at(10 * DAY),
      submissionStartsAt: at(-4 * DAY),
      submissionEndsAt: at(20 * DAY),
      resultAt: at(22 * DAY),
    },
    ...over,
  };
}

const guest: ViewerInput = { registration: null, hasSubmission: false };
const registered: ViewerInput = { registration: { status: 'confirmed' }, hasSubmission: false };

describe('getPhase', () => {
  it('walks through the lifecycle as time passes', () => {
    const c = comp();
    expect(getPhase(c, at(-6 * DAY))).toBe('upcoming');
    expect(getPhase(c, now)).toBe('registration_open');
    expect(getPhase(c, at(11 * DAY))).toBe('in_progress');
    expect(getPhase(c, at(21 * DAY))).toBe('judging');
    expect(getPhase(c, at(23 * DAY))).toBe('completed');
  });

  it('treats boundaries as half-open intervals [start, end)', () => {
    const c = comp();
    expect(getPhase(c, c.schedule.registrationClosesAt)).toBe('in_progress');
    expect(getPhase(c, c.schedule.registrationOpensAt)).toBe('registration_open');
  });

  it('cancelled overrides everything', () => {
    expect(getPhase(comp({ status: 'cancelled' }), now)).toBe('cancelled');
  });
});

describe('getCountdown', () => {
  it('counts down to registration close and flags urgency near the deadline', () => {
    expect(getCountdown(comp(), now)).toMatchObject({ kind: 'registration_closes', urgent: false });
    expect(getCountdown(comp(), at(9 * DAY))).toMatchObject({ kind: 'registration_closes', urgent: true });
  });

  it('flags urgency when few spots remain', () => {
    expect(getCountdown(comp({ bookedCount: 16 }), now)?.urgent).toBe(true);
  });

  it('switches target after registration closes', () => {
    const c = comp({ schedule: { ...comp().schedule, submissionStartsAt: at(12 * DAY) } });
    expect(getCountdown(c, at(11 * DAY))?.kind).toBe('submission_starts');
    expect(getCountdown(c, at(13 * DAY))?.kind).toBe('submission_ends');
    expect(getCountdown(c, at(21 * DAY))?.kind).toBe('results_in');
    expect(getCountdown(c, at(30 * DAY))).toBeNull();
  });
});

describe('getCta', () => {
  it('lets guests register while seats remain', () => {
    expect(getCta(comp(), guest, now)).toMatchObject({ action: 'register', enabled: true });
  });

  it('shows sold out when capacity is reached', () => {
    expect(getCta(comp({ bookedCount: 20 }), guest, now)).toMatchObject({ enabled: false, reason: 'sold_out' });
  });

  it('shows upcoming / closed states', () => {
    expect(getCta(comp(), guest, at(-6 * DAY))).toMatchObject({ enabled: false, reason: 'registration_not_open' });
    expect(getCta(comp(), guest, at(11 * DAY))).toMatchObject({ enabled: false, reason: 'registration_closed' });
  });

  it('asks to complete payment while a hold is active, and forgets lapsed holds', () => {
    const pending: ViewerInput = { registration: { status: 'pending_payment', holdExpiresAt: at(10 * 60_000) }, hasSubmission: false };
    expect(getCta(comp(), pending, now)).toMatchObject({ action: 'complete_payment', enabled: true });
    expect(getCta(comp(), pending, at(11 * 60_000))).toMatchObject({ action: 'register', enabled: true });
  });

  it('drives the submission flow for registered users', () => {
    expect(getCta(comp(), registered, now)).toMatchObject({ action: 'upload_submission', enabled: true });
    expect(getCta(comp(), { ...registered, hasSubmission: true }, now)).toMatchObject({ action: 'replace_submission' });
    const later = comp({ schedule: { ...comp().schedule, submissionStartsAt: at(DAY) } });
    expect(getCta(later, registered, now)).toMatchObject({ enabled: false, reason: 'submission_not_started' });
    expect(getCta(comp(), registered, at(21 * DAY))).toMatchObject({ enabled: false, reason: 'submission_missed' });
    expect(getCta(comp(), { ...registered, hasSubmission: true }, at(21 * DAY))).toMatchObject({ reason: 'awaiting_results' });
  });

  it('shows results once published', () => {
    expect(getCta(comp({ hasResults: true }), guest, at(23 * DAY))).toMatchObject({ action: 'view_results', enabled: true });
  });

  it('blocks every action on a cancelled competition, even for participants', () => {
    expect(getCta(comp({ status: 'cancelled' }), registered, now)).toMatchObject({ enabled: false, reason: 'cancelled' });
  });
});

describe('getNextTransitionAt', () => {
  it('returns the nearest future instant including extras such as hold expiry', () => {
    const c = comp();
    expect(getNextTransitionAt(c.schedule, now)).toEqual(c.schedule.registrationClosesAt);
    expect(getNextTransitionAt(c.schedule, now, [at(60_000)])).toEqual(at(60_000));
    expect(getNextTransitionAt(c.schedule, at(30 * DAY))).toBeNull();
  });
});
