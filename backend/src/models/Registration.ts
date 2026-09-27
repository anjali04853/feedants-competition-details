import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * pending_payment -> confirmed            payment verified while the hold is valid
 * pending_payment -> expired              hold lapsed; seat released by the sweeper
 * pending_payment -> cancelled            user abandoned checkout; seat released
 * expired/cancelled -> pending_payment    user tries again while seats are available
 */
export const REGISTRATION_STATUSES = ['pending_payment', 'confirmed', 'expired', 'cancelled'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** Statuses that occupy a seat (counted in Competition.bookedCount). */
export const SEAT_HOLDING_STATUSES: RegistrationStatus[] = ['pending_payment', 'confirmed'];

const RegistrationSchema = new Schema(
  {
    competition: { type: Schema.Types.ObjectId, ref: 'Competition', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: REGISTRATION_STATUSES, required: true },
    amount: { type: Number, required: true, min: 0 }, // paise, snapshot of the fee at booking time
    currency: { type: String, default: 'INR' },
    holdExpiresAt: { type: Date },
    payment: {
      provider: String,
      orderId: String,
      paymentId: String,
      paidAt: Date,
      /** Set when money was captured but no seat could be honoured (hold lapsed + sold out). */
      refundStatus: { type: String, enum: ['pending', 'processed'] },
    },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: Date,
  },
  { timestamps: true },
);

// One registration record per user per competition. This is the primary guard
// against duplicate registrations from double taps, retries and multiple devices.
RegistrationSchema.index({ competition: 1, user: 1 }, { unique: true });
// Hold sweeper: only pending rows are indexed, which keeps the index tiny.
RegistrationSchema.index(
  { holdExpiresAt: 1 },
  { partialFilterExpression: { status: 'pending_payment' } },
);
RegistrationSchema.index({ 'payment.orderId': 1 }, { unique: true, sparse: true });
RegistrationSchema.index({ user: 1, createdAt: -1 });

export type Registration = InferSchemaType<typeof RegistrationSchema> & { _id: Types.ObjectId };
export const RegistrationModel = model('Registration', RegistrationSchema);
