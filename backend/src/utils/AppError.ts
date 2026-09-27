/**
 * Machine-readable error codes. The mobile client switches on these,
 * so treat them as part of the public API contract.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'COMPETITION_NOT_AVAILABLE'
  | 'REGISTRATION_NOT_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'SOLD_OUT'
  | 'ALREADY_REGISTERED'
  | 'HOLD_EXPIRED'
  | 'INVALID_PAYMENT'
  | 'NOT_REGISTERED'
  | 'SUBMISSION_NOT_OPEN'
  | 'SUBMISSION_CLOSED'
  | 'INVALID_FILE'
  | 'INVALID_REFERRAL'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(what = 'Resource') {
    return new AppError(404, 'NOT_FOUND', `${what} not found`);
  }

  static conflict(code: ErrorCode, message: string, details?: unknown) {
    return new AppError(409, code, message, details);
  }
}
