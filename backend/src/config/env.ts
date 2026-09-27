import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('*'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/feedants'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENABLE_DEV_LOGIN: bool.default(false),
  SEAT_HOLD_MINUTES: z.coerce.number().positive().default(10),
  HOLD_SWEEP_INTERVAL_SECONDS: z.coerce.number().positive().default(30),
  PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(8),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(100),
  PUBLIC_BASE_URL: z.string().optional().default(''),
  REFERRAL_BASE_URL: z.string().url().default('https://feedants.com/r'),
});

const parsed = EnvSchema.safeParse({
  ...process.env,
  // Sensible defaults for the test runner so tests don't depend on a local .env
  ...(process.env.NODE_ENV === 'test' && {
    JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret-test-secret',
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET ?? 'test-payment-secret',
  }),
});

if (!parsed.success) {
  // Fail fast: a misconfigured server should never start.
  console.error('Invalid environment configuration:\n', z.prettifyError(parsed.error));
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.ENABLE_DEV_LOGIN) {
  console.error('ENABLE_DEV_LOGIN must not be enabled in production');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
