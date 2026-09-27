import { Schema, model, InferSchemaType, Types } from 'mongoose';

const SubmissionSchema = new Schema(
  {
    competition: { type: Schema.Types.ObjectId, ref: 'Competition', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    file: {
      type: new Schema(
        {
          storageKey: { type: String, required: true },
          mimeType: { type: String, required: true },
          size: { type: Number, required: true },
          originalName: String,
        },
        { _id: false },
      ),
      required: true,
    },
    /** Incremented each time the participant replaces their entry before the deadline. */
    revision: { type: Number, required: true, min: 1 },
    submittedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// One active entry per participant; replacing an entry updates this document.
SubmissionSchema.index({ competition: 1, user: 1 }, { unique: true });

export type Submission = InferSchemaType<typeof SubmissionSchema> & { _id: Types.ObjectId };
export const SubmissionModel = model('Submission', SubmissionSchema);
