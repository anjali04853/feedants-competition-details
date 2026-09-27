import { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};

/** Every error leaves the API in one shape: { error: { code, message, details? } }. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })));
  } else if (err instanceof MulterError) {
    appError = err.code === 'LIMIT_FILE_SIZE'
      ? new AppError(413, 'INVALID_FILE', 'File is too large')
      : new AppError(400, 'INVALID_FILE', err.message);
  } else if (err instanceof mongoose.Error.CastError) {
    appError = new AppError(400, 'VALIDATION_ERROR', `Invalid value for ${err.path}`);
  } else if (err?.type === 'entity.parse.failed') {
    appError = new AppError(400, 'VALIDATION_ERROR', 'Malformed JSON body');
  } else {
    logger.error({ err, path: req.path }, 'Unhandled error');
    appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }

  res.status(appError.status).json({
    error: { code: appError.code, message: appError.message, ...(appError.details ? { details: appError.details } : {}) },
  });
};
