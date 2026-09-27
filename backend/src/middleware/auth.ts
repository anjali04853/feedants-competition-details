import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: Types.ObjectId;
  }
}

export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

function readUserId(header: string | undefined): Types.ObjectId | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as jwt.JwtPayload;
    return payload.sub && Types.ObjectId.isValid(payload.sub) ? new Types.ObjectId(payload.sub) : undefined;
  } catch {
    return undefined;
  }
}

/** Stateless JWT auth: no session store, so API instances scale horizontally. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const userId = readUserId(req.headers.authorization);
  if (!userId) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  req.userId = userId;
  next();
};
