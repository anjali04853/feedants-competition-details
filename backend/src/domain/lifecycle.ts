/**
 * Pure, side-effect-free competition lifecycle rules.
 *
 * Everything time-dependent is derived from the schedule and an explicit `now`,
 * so the server is the single source of truth (the client never decides whether
 * an action is allowed) and the rules are trivially unit-testable.
 */

export interface Schedule {
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  resultAt: Date;
}

export interface LifecycleInput {
  status: 'draft' | 'published' | 'cancelled';
  schedule: Schedule;
  capacity: number;
  bookedCount: number;
  hasResults: boolean;
}

export type Phase =
  | 'cancelled'
  | 'upcoming' // registration not open yet
  | 'registration_open'
  | 'in_progress' // registration closed, submissions not finished
  | 'judging' // submissions closed, results pending
  | 'completed'; // results date reached

export type CountdownKind =
  | 'registration_opens'
  | 'registration_closes'
  | 'submission_starts'
  | 'submission_ends'
  | 'results_in';

export interface Countdown {
  kind: CountdownKind;
  endsAt: Date;
  /** Shown as "Hurry up!" in the UI. */
  urgent: boolean;
}

const HOUR = 60 * 60 * 1000;
/** Registration is flagged urgent when it closes within this window... */
export const URGENT_WINDOW_MS = 72 * HOUR;
/** ...or when this fraction of seats (or fewer) remains. */
export const URGENT_SPOTS_RATIO = 0.25;

const t = (d: Date) => new Date(d).getTime();

export function getPhase(c: LifecycleInput, now: Date): Phase {
  if (c.status === 'cancelled') return 'cancelled';
  const n = now.getTime();
  const s = c.schedule;
  if (n < t(s.registrationOpensAt)) return 'upcoming';
  if (n < t(s.registrationClosesAt)) return 'registration_open';
  if (n < t(s.submissionEndsAt)) return 'in_progress';
  if (n < t(s.resultAt)) return 'judging';
  return 'completed';
}

export function isRegistrationOpen(c: LifecycleInput, now: Date): boolean {
  return getPhase(c, now) === 'registration_open';
}

export function isSubmissionOpen(c: LifecycleInput, now: Date): boolean {
  if (c.status !== 'published') return false;
  const n = now.getTime();
  return n >= t(c.schedule.submissionStartsAt) && n < t(c.schedule.submissionEndsAt);
}

export function remainingSpots(c: Pick<LifecycleInput, 'capacity' | 'bookedCount'>): number {
  return Math.max(0, c.capacity - c.bookedCount);
}

export function getCountdown(c: LifecycleInput, now: Date): Countdown | null {
  const s = c.schedule;
  const phase = getPhase(c, now);
  const n = now.getTime();

  switch (phase) {
    case 'upcoming':
      return { kind: 'registration_opens', endsAt: s.registrationOpensAt, urgent: false };
    case 'registration_open': {
      const msLeft = t(s.registrationClosesAt) - n;
      const spotsRatio = remainingSpots(c) / c.capacity;
      return {
        kind: 'registration_closes',
        endsAt: s.registrationClosesAt,
        urgent: msLeft <= URGENT_WINDOW_MS || spotsRatio <= URGENT_SPOTS_RATIO,
      };
    }
    case 'in_progress':
      return n < t(s.submissionStartsAt)
        ? { kind: 'submission_starts', endsAt: s.submissionStartsAt, urgent: false }
        : {
            kind: 'submission_ends',
            endsAt: s.submissionEndsAt,
            urgent: t(s.submissionEndsAt) - n <= URGENT_WINDOW_MS,
          };
    case 'judging':
      return { kind: 'results_in', endsAt: s.resultAt, urgent: false };
    default:
      return null;
  }
}

/**
 * The next instant at which anything time-dependent changes. Clients schedule a
 * refetch for this moment, so the screen flips state exactly on time without polling.
 */
export function getNextTransitionAt(schedule: Schedule, now: Date, extra: (Date | null | undefined)[] = []): Date | null {
  const n = now.getTime();
  const candidates = [...Object.values(schedule), ...extra]
    .filter((d): d is Date => !!d)
    .map(t)
    .filter((ms) => ms > n);
  return candidates.length ? new Date(Math.min(...candidates)) : null;
}

// ---------------------------------------------------------------------------
// Viewer-specific call to action
// ---------------------------------------------------------------------------

export interface ViewerInput {
  registration: {
    status: 'pending_payment' | 'confirmed' | 'expired' | 'cancelled';
    holdExpiresAt?: Date | null;
  } | null;
  hasSubmission: boolean;
}

export type CtaAction =
  | 'register'
  | 'complete_payment'
  | 'upload_submission'
  | 'replace_submission'
  | 'view_results'
  | 'none';

export type CtaReason =
  | 'cancelled'
  | 'registration_not_open'
  | 'sold_out'
  | 'registration_closed'
  | 'submission_not_started'
  | 'submission_closed'
  | 'submission_missed'
  | 'awaiting_results'
  | null;

export interface Cta {
  action: CtaAction;
  enabled: boolean;
  /** Why the action is disabled (or context for an enabled one). */
  reason: CtaReason;
  /** A relevant timestamp for the reason, e.g. when submissions open. */
  at: Date | null;
}

export type ViewerStatus = 'not_registered' | 'payment_pending' | 'registered';

export function hasActiveHold(viewer: ViewerInput, now: Date): boolean {
  const r = viewer.registration;
  return !!r && r.status === 'pending_payment' && !!r.holdExpiresAt && t(r.holdExpiresAt) > now.getTime();
}

export function getViewerStatus(viewer: ViewerInput, now: Date): ViewerStatus {
  if (viewer.registration?.status === 'confirmed') return 'registered';
  if (hasActiveHold(viewer, now)) return 'payment_pending';
  return 'not_registered';
}

export function getCta(c: LifecycleInput, viewer: ViewerInput, now: Date): Cta {
  const phase = getPhase(c, now);
  const s = c.schedule;
  const status = getViewerStatus(viewer, now);
  const cta = (action: CtaAction, enabled: boolean, reason: CtaReason = null, at: Date | null = null): Cta => ({
    action,
    enabled,
    reason,
    at,
  });

  if (phase === 'cancelled') return cta('none', false, 'cancelled');

  if (status === 'registered') {
    if (phase === 'completed') {
      return c.hasResults ? cta('view_results', true) : cta('none', false, 'awaiting_results', s.resultAt);
    }
    if (isSubmissionOpen(c, now)) {
      return viewer.hasSubmission
        ? cta('replace_submission', true, null, s.submissionEndsAt)
        : cta('upload_submission', true, null, s.submissionEndsAt);
    }
    if (now.getTime() < t(s.submissionStartsAt)) {
      return cta('upload_submission', false, 'submission_not_started', s.submissionStartsAt);
    }
    // Submission window is over.
    return viewer.hasSubmission
      ? cta('none', false, 'awaiting_results', s.resultAt)
      : cta('none', false, 'submission_missed');
  }

  if (status === 'payment_pending') {
    // A hold granted before registration closed is honoured until it expires.
    return cta('complete_payment', true, null, viewer.registration!.holdExpiresAt ?? null);
  }

  // Not registered
  switch (phase) {
    case 'upcoming':
      return cta('register', false, 'registration_not_open', s.registrationOpensAt);
    case 'registration_open':
      return remainingSpots(c) > 0 ? cta('register', true) : cta('register', false, 'sold_out');
    case 'completed':
      return c.hasResults ? cta('view_results', true) : cta('none', false, 'registration_closed');
    default:
      return cta('register', false, 'registration_closed');
  }
}
