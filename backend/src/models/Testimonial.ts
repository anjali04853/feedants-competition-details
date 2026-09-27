import { Schema, model, InferSchemaType } from 'mongoose';
import { LocalizedSchema } from './localized';

const TestimonialSchema = new Schema(
  {
    userName: { type: String, required: true },
    avatarUrl: String,
    quote: { type: LocalizedSchema, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

TestimonialSchema.index({ isPublished: 1, createdAt: -1 });

export type Testimonial = InferSchemaType<typeof TestimonialSchema>;
export const TestimonialModel = model('Testimonial', TestimonialSchema);
