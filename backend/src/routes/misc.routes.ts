import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { requireAuth, signToken } from '../middleware/auth';
import { resolveLang } from '../middleware/requestContext';
import { TestimonialModel } from '../models/Testimonial';
import { UserModel } from '../models/User';
import { localize } from '../models/localized';
import { mockGateway } from '../services/payment.service';
import { AppError } from '../utils/AppError';
import { objectIdSchema } from '../utils/objectId';
import { send } from './respond';

// ---------------------------------------------------------------- health
export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
});

// ---------------------------------------------------------------- auth
/**
 * Real auth (phone OTP etc.) is out of scope for this assignment. The dev login
 * issues a JWT for a seeded user so several "users" can be simulated from one
 * device. Everything downstream relies only on the verified JWT.
 */
export const authRouter = Router();

const userDto = (u: { _id: unknown; name: string; avatarUrl?: string | null; referralCode: string }) => ({
  id: String(u._id),
  name: u.name,
  avatarUrl: u.avatarUrl ?? null,
  referralCode: u.referralCode,
});

authRouter.use((_req, _res, next) => {
  if (!env.ENABLE_DEV_LOGIN) throw AppError.notFound('Route');
  next();
});

authRouter.get('/dev-users', async (_req, res) => {
  const users = await UserModel.find({}, { name: 1, avatarUrl: 1, referralCode: 1 }).sort({ createdAt: 1 }).limit(20).lean();
  send(res, users.map(userDto));
});

authRouter.post('/dev-login', async (req, res) => {
  const { userId } = z.object({ userId: objectIdSchema }).parse(req.body);
  const user = await UserModel.findById(userId).lean();
  if (!user) throw AppError.notFound('User');
  send(res, { token: signToken(String(user._id)), user: userDto(user) });
});

// ---------------------------------------------------------------- users
export const usersRouter = Router();
usersRouter.get('/me', requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.userId).lean();
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Account no longer exists');
  send(res, userDto(user));
});

// ---------------------------------------------------------------- testimonials
export const testimonialsRouter = Router();
testimonialsRouter.get('/', async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(50).default(10).parse(req.query.limit);
  const lang = resolveLang(req);
  const items = await TestimonialModel.find({ isPublished: true }).sort({ createdAt: -1 }).limit(limit).lean();
  res.set('Cache-Control', 'public, max-age=300');
  res.vary('Accept-Language');
  send(res, items.map((t) => ({
    id: String(t._id),
    userName: t.userName,
    avatarUrl: t.avatarUrl ?? null,
    quote: localize(t.quote, lang),
    rating: t.rating,
  })));
});

// ---------------------------------------------------------------- mock gateway
/** Simulates the hosted checkout (e.g. Razorpay Checkout). Never mounted in production. */
export const mockPaymentsRouter = Router();
mockPaymentsRouter.post('/checkout', requireAuth, (req, res) => {
  const { orderId } = z.object({ orderId: z.string().min(1).max(64) }).parse(req.body);
  send(res, mockGateway.simulateCheckout(orderId));
});
