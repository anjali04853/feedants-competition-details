import { Response } from 'express';
import { clock } from '../utils/clock';

/**
 * Every success response carries the server time. Clients compute
 * `offset = serverTime - Date.now()` so countdowns stay correct even when the
 * device clock is wrong. That matters here because the deadlines are real.
 */
export function send<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ data, meta: { serverTime: clock.now().toISOString() } });
}
