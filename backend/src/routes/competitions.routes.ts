import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { Types } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { mutationLimiter, requestBaseUrl, resolveLang } from '../middleware/requestContext';
import {
  findPublishedCompetition,
  getViewerState,
  listCompetitions,
  toCompetitionDto,
} from '../services/competition.service';
import { register } from '../services/registration.service';
import { upsertSubmission } from '../services/submission.service';
import { uploadDir } from '../services/storage.service';
import { AppError } from '../utils/AppError';
import { clock } from '../utils/clock';
import { send } from './respond';

export const competitionsRouter = Router();

const RegisterBody = z.object({
  referralCode: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9]+$/).optional(),
});

competitionsRouter.get('/', async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);
  res.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
  res.vary('Accept-Language');
  send(res, await listCompetitions(resolveLang(req), clock.now(), { limit }));
});

/**
 * Public, viewer-independent details. Split from /me so this response is
 * identical for every user and can be cached by a CDN or reverse proxy; that is
 * what absorbs traffic spikes when thousands of users open the same competition.
 */
competitionsRouter.get('/:idOrSlug', async (req, res) => {
  const competition = await findPublishedCompetition(String(req.params.idOrSlug));
  res.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
  res.vary('Accept-Language');
  send(res, toCompetitionDto(competition, resolveLang(req), clock.now()));
});

/** Viewer-specific state: registration, submission, the allowed action, referral link. */
competitionsRouter.get('/:idOrSlug/me', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  send(res, await getViewerState(String(req.params.idOrSlug), req.userId!, clock.now(), requestBaseUrl(req)));
});

competitionsRouter.post('/:idOrSlug/registrations', requireAuth, mutationLimiter, async (req, res) => {
  const body = RegisterBody.parse(req.body ?? {});
  const competition = await findPublishedCompetition(String(req.params.idOrSlug));
  const { registration, created } = await register(competition._id, req.userId!, body, clock.now());
  send(
    res,
    {
      id: String(registration._id),
      status: registration.status,
      amount: registration.amount,
      currency: registration.currency,
      holdExpiresAt: registration.holdExpiresAt ?? null,
      order: registration.status === 'pending_payment' && registration.payment?.orderId
        ? { provider: registration.payment.provider, orderId: registration.payment.orderId, amount: registration.amount, currency: registration.currency }
        : null,
    },
    created ? 201 : 200,
  );
});

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8);
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new AppError(400, 'INVALID_FILE', 'Please upload a video file'));
  },
});

competitionsRouter.post(
  '/:idOrSlug/submission',
  requireAuth,
  mutationLimiter,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) throw new AppError(400, 'INVALID_FILE', 'Attach a video in the "file" field');
    const competition = await findPublishedCompetition(String(req.params.idOrSlug));
    const submission = await upsertSubmission(
      competition._id as Types.ObjectId,
      req.userId!,
      {
        storageKey: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname,
      },
      clock.now(),
    );
    send(res, {
      id: String(submission._id),
      revision: submission.revision,
      submittedAt: submission.submittedAt,
    }, submission.revision === 1 ? 201 : 200);
  },
);
