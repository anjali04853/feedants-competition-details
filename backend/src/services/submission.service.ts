import { Types } from 'mongoose';
import { CompetitionModel } from '../models/Competition';
import { RegistrationModel } from '../models/Registration';
import { SubmissionModel, Submission } from '../models/Submission';
import { isSubmissionOpen } from '../domain/lifecycle';
import { AppError } from '../utils/AppError';
import { toLifecycleInput } from './competition.service';
import { deleteFile } from './storage.service';

export interface UploadedFile {
  storageKey: string;
  mimeType: string;
  size: number;
  originalName?: string;
}

/**
 * Creates or replaces the participant's entry. Only confirmed (paid)
 * participants may submit, and only inside the submission window. This is the
 * server-side enforcement of the "only paid participants are judged" rule.
 */
export async function upsertSubmission(
  competitionId: Types.ObjectId,
  userId: Types.ObjectId,
  file: UploadedFile,
  now: Date,
): Promise<Submission> {
  try {
    const competition = await CompetitionModel.findById(competitionId).lean();
    if (!competition || competition.status === 'draft') throw AppError.notFound('Competition');
    if (competition.status === 'cancelled') {
      throw AppError.conflict('COMPETITION_NOT_AVAILABLE', 'This competition has been cancelled');
    }

    const registration = await RegistrationModel.findOne(
      { competition: competitionId, user: userId, status: 'confirmed' },
      { _id: 1 },
    ).lean();
    if (!registration) {
      throw new AppError(403, 'NOT_REGISTERED', 'Only registered participants can upload a submission');
    }

    if (!isSubmissionOpen(toLifecycleInput(competition), now)) {
      throw now < competition.schedule.submissionStartsAt
        ? AppError.conflict('SUBMISSION_NOT_OPEN', 'Submissions have not opened yet')
        : AppError.conflict('SUBMISSION_CLOSED', 'The submission deadline has passed');
    }

    const previous = await SubmissionModel.findOneAndUpdate(
      { competition: competitionId, user: userId },
      {
        $set: { registration: registration._id, file, submittedAt: now },
        $inc: { revision: 1 },
      },
      { upsert: true, returnDocument: 'before' },
    ).lean();

    // Replaced entries are cleaned up after the new one is safely recorded.
    if (previous && previous.file.storageKey !== file.storageKey) await deleteFile(previous.file.storageKey);

    const saved = await SubmissionModel.findOne({ competition: competitionId, user: userId }).lean();
    return saved!;
  } catch (err) {
    await deleteFile(file.storageKey); // don't leave orphaned uploads behind on rejection
    throw err;
  }
}
