import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { mutationLimiter } from '../middleware/requestContext';
import { cancelHold, confirmPayment } from '../services/registration.service';
import { clock } from '../utils/clock';
import { objectIdSchema } from '../utils/objectId';
import { send } from './respond';

export const registrationsRouter = Router();

const ConfirmPaymentBody = z.object({
  orderId: z.string().min(1).max(64),
  paymentId: z.string().min(1).max(64),
  signature: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid signature format'),
});

const toDto = (r: { _id: Types.ObjectId; status: string; confirmedAt?: Date | null }) => ({
  id: String(r._id),
  status: r.status,
  confirmedAt: r.confirmedAt ?? null,
});

registrationsRouter.post('/:id/payment/confirm', requireAuth, mutationLimiter, async (req, res) => {
  const id = new Types.ObjectId(objectIdSchema.parse(req.params.id));
  const body = ConfirmPaymentBody.parse(req.body);
  send(res, toDto(await confirmPayment(id, req.userId!, body, clock.now())));
});

registrationsRouter.post('/:id/cancel', requireAuth, mutationLimiter, async (req, res) => {
  const id = new Types.ObjectId(objectIdSchema.parse(req.params.id));
  send(res, toDto(await cancelHold(id, req.userId!)));
});
