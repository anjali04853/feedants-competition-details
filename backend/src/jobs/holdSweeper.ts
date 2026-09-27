import { releaseExpiredHolds } from '../services/registration.service';
import { clock } from '../utils/clock';
import { logger } from '../utils/logger';

/**
 * Periodically frees seats whose payment hold lapsed. Each release is an atomic
 * conditional update, so running this on every API instance at once is safe.
 * Holds are also released lazily when the same user retries, so the UI never
 * depends on the sweeper's timing to be correct.
 */
export function startHoldSweeper(intervalSeconds: number): () => void {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return; // never overlap runs on the same instance
    running = true;
    try {
      await releaseExpiredHolds(clock.now());
    } catch (err) {
      logger.error({ err }, 'Hold sweeper failed');
    } finally {
      running = false;
    }
  }, intervalSeconds * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
