import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { LANGS, Lang } from '../models/localized';
import { env } from '../config/env';

/** ?lang= wins, then Accept-Language, then English. */
export function resolveLang(req: Request): Lang {
  const q = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase() : undefined;
  if (q && (LANGS as readonly string[]).includes(q)) return q as Lang;
  return req.acceptsLanguages('en', 'hi') === 'hi' ? 'hi' : 'en';
}

export function requestBaseUrl(req: Request): string {
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * Per-user limit on state-changing endpoints (falls back to IP when anonymous).
 * In-memory store is fine for one instance; with several instances this should
 * use a shared store (e.g. rate-limit-redis).
 */
export const mutationLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.NODE_ENV === 'test' ? 10_000 : 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? `u:${req.userId}` : `ip:${req.ip}`),
  validate: { keyGeneratorIpFallback: false },
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } });
  },
});
