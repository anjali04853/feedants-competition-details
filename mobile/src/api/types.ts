/** Mirrors the backend response contracts (backend/src/services/competition.service.ts). */

export type Phase = 'cancelled' | 'upcoming' | 'registration_open' | 'in_progress' | 'judging' | 'completed';

export type CountdownKind =
  | 'registration_opens'
  | 'registration_closes'
  | 'submission_starts'
  | 'submission_ends'
  | 'results_in';

export interface Countdown {
  kind: CountdownKind;
  endsAt: string;
  urgent: boolean;
}

export interface Schedule {
  registrationOpensAt: string;
  registrationClosesAt: string;
  submissionStartsAt: string;
  submissionEndsAt: string;
  resultAt: string;
}

export interface Spots {
  capacity: number;
  booked: number;
  remaining: number;
}

export interface Competition {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  certificateForWinners: boolean;
  currency: string;
  prizePool: number;
  entryFee: number;
  spots: Spots;
  judge: {
    name: string;
    title: string;
    experienceYears: number | null;
    avatarUrl: string | null;
    introVideoUrl: string | null;
  };
  schedule: Schedule;
  status: 'published' | 'cancelled';
  phase: Phase;
  isRegistrationOpen: boolean;
  isSubmissionOpen: boolean;
  countdown: Countdown | null;
  rewards: { position: number; amount: number }[];
  previousWinners: {
    id: string;
    name: string;
    position: number;
    thumbnailUrl: string | null;
    videoUrl: string | null;
    edition: string | null;
  }[];
  about: string;
  judgingParameters: { title: string; weight: number | null }[];
  rules: string[];
  disclaimer: string | null;
  prizeInfoVideoUrl: string | null;
  referralRewardPerSignup: number;
  results: { position: number; name: string; amount: number }[];
  nextTransitionAt: string | null;
  updatedAt: string;
}

export interface CompetitionSummary {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  prizePool: number;
  entryFee: number;
  currency: string;
  spots: Spots;
  phase: Phase;
  countdown: Countdown | null;
  judgeName: string;
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

export interface ViewerState {
  competitionId: string;
  status: 'not_registered' | 'payment_pending' | 'registered';
  registration: {
    id: string;
    status: 'pending_payment' | 'confirmed' | 'expired' | 'cancelled';
    amount: number;
    currency: string;
    holdExpiresAt: string | null;
    confirmedAt: string | null;
    orderId: string | null;
    refundPending: boolean;
  } | null;
  submission: {
    id: string;
    url: string;
    originalName: string | null;
    size: number;
    revision: number;
    submittedAt: string;
  } | null;
  cta: { action: CtaAction; enabled: boolean; reason: CtaReason; at: string | null };
  referral: { code: string; link: string; rewardPerSignup: number } | null;
  nextTransitionAt: string | null;
}

export interface RegistrationResult {
  id: string;
  status: 'pending_payment' | 'confirmed';
  amount: number;
  currency: string;
  holdExpiresAt: string | null;
  order: { provider: string; orderId: string; amount: number; currency: string } | null;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string | null;
  referralCode: string;
}

export interface Testimonial {
  id: string;
  userName: string;
  avatarUrl: string | null;
  quote: string;
  rating: number;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'COMPETITION_NOT_AVAILABLE'
  | 'REGISTRATION_NOT_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'SOLD_OUT'
  | 'ALREADY_REGISTERED'
  | 'HOLD_EXPIRED'
  | 'INVALID_PAYMENT'
  | 'NOT_REGISTERED'
  | 'SUBMISSION_NOT_OPEN'
  | 'SUBMISSION_CLOSED'
  | 'INVALID_FILE'
  | 'INVALID_REFERRAL'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';
