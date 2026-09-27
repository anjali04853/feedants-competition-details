import { Schema, model, InferSchemaType, Types } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    referralCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true },
);

UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

export type User = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
export const UserModel = model('User', UserSchema);
