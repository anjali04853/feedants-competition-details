import { Schema, model, InferSchemaType, Types } from 'mongoose';
import { LocalizedSchema } from './localized';

export const COMPETITION_STATUSES = ['draft', 'published', 'cancelled'] as const;

const JudgeSchema = new Schema(
  {
    name: { type: String, required: true },
    title: { type: LocalizedSchema, required: true },
    experienceYears: { type: Number, min: 0 },
    avatarUrl: String,
    introVideoUrl: String,
  },
  { _id: false },
);

const ScheduleSchema = new Schema(
  {
    registrationOpensAt: { type: Date, required: true },
    registrationClosesAt: { type: Date, required: true },
    submissionStartsAt: { type: Date, required: true },
    submissionEndsAt: { type: Date, required: true },
    resultAt: { type: Date, required: true },
  },
  { _id: false },
);

const RewardSchema = new Schema(
  {
    position: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 }, // paise
  },
  { _id: false },
);

const PreviousWinnerSchema = new Schema({
  name: { type: String, required: true },
  position: { type: Number, required: true, min: 1 },
  thumbnailUrl: String,
  videoUrl: String,
  edition: String,
});

const JudgingParameterSchema = new Schema(
  {
    title: { type: LocalizedSchema, required: true },
    weight: { type: Number, min: 0, max: 100 }, // percentage of the total score
  },
  { _id: false },
);

const ResultSchema = new Schema(
  {
    position: { type: Number, required: true, min: 1 },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const CompetitionSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: LocalizedSchema, required: true },
    tags: { type: [LocalizedSchema], default: [] },
    certificateForWinners: { type: Boolean, default: false },

    currency: { type: String, default: 'INR' },
    prizePool: { type: Number, required: true, min: 0 }, // paise
    entryFee: { type: Number, required: true, min: 0 }, // paise, 0 = free

    capacity: { type: Number, required: true, min: 1 },
    /**
     * Seats taken = confirmed registrations + active payment holds.
     * Only ever mutated with atomic, conditional $inc (see registration.service)
     * so it can never exceed `capacity`, even under heavy concurrency.
     */
    bookedCount: { type: Number, default: 0, min: 0 },

    judge: { type: JudgeSchema, required: true },
    schedule: { type: ScheduleSchema, required: true },
    rewards: { type: [RewardSchema], default: [] },
    previousWinners: { type: [PreviousWinnerSchema], default: [] },

    about: { type: LocalizedSchema, required: true },
    judgingParameters: { type: [JudgingParameterSchema], default: [] },
    rules: { type: [LocalizedSchema], default: [] },
    disclaimer: LocalizedSchema,
    prizeInfoVideoUrl: String,
    referralRewardPerSignup: { type: Number, default: 0, min: 0 }, // paise

    results: { type: [ResultSchema], default: [] },
    status: { type: String, enum: COMPETITION_STATUSES, default: 'draft', index: true },
  },
  { timestamps: true },
);

// Listing screen: "published competitions, soonest deadline first"
CompetitionSchema.index({ status: 1, 'schedule.registrationClosesAt': 1 });

type ScheduleKey =
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'submissionStartsAt'
  | 'submissionEndsAt'
  | 'resultAt';

/** Pairs [earlier, later] that must be chronologically ordered. */
const SCHEDULE_ORDER: [ScheduleKey, ScheduleKey][] = [
  ['registrationOpensAt', 'registrationClosesAt'],
  ['submissionStartsAt', 'submissionEndsAt'],
  ['registrationClosesAt', 'submissionEndsAt'],
  ['submissionEndsAt', 'resultAt'],
];

/** Business invariants that must hold for any competition we persist. */
CompetitionSchema.pre('validate', function () {
  const s = this.schedule;
  if (s) {
    for (const [earlier, later] of SCHEDULE_ORDER) {
      if (s[earlier] > s[later]) {
        this.invalidate(`schedule.${later}`, `${later} must not be before ${earlier}`);
      }
    }
  }

  const positions = this.rewards.map((r) => r.position);
  if (new Set(positions).size !== positions.length) {
    this.invalidate('rewards', 'Reward positions must be unique');
  }
  const rewardTotal = this.rewards.reduce((sum, r) => sum + r.amount, 0);
  if (this.rewards.length && rewardTotal !== this.prizePool) {
    this.invalidate('rewards', `Rewards (${rewardTotal}) must add up to the prize pool (${this.prizePool})`);
  }

  if (this.bookedCount > this.capacity) {
    this.invalidate('bookedCount', 'bookedCount cannot exceed capacity');
  }
});

export type Competition = InferSchemaType<typeof CompetitionSchema> & { _id: Types.ObjectId };
export const CompetitionModel = model('Competition', CompetitionSchema);
