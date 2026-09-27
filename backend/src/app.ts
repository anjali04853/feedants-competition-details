import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { competitionsRouter } from './routes/competitions.routes';
import { registrationsRouter } from './routes/registrations.routes';
import { authRouter, healthRouter, mockPaymentsRouter, testimonialsRouter, usersRouter } from './routes/misc.routes';
import { uploadDir } from './services/storage.service';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct client IPs / protocol behind a load balancer
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((s) => s.trim()) }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  if (env.NODE_ENV !== 'test') app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.use('/health', healthRouter);
  app.use('/uploads', express.static(uploadDir, { maxAge: '1d', fallthrough: false }));

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/users', usersRouter);
  api.use('/competitions', competitionsRouter);
  api.use('/registrations', registrationsRouter);
  api.use('/testimonials', testimonialsRouter);
  if (env.PAYMENT_PROVIDER === 'mock' && env.NODE_ENV !== 'production') {
    api.use('/dev/payments', mockPaymentsRouter);
  }
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
