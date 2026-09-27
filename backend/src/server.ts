import { env } from './config/env';
import { createApp } from './app';
import { connectDb, disconnectDb } from './db/connect';
import { startHoldSweeper } from './jobs/holdSweeper';
import { ensureUploadDir } from './services/storage.service';
import { logger } from './utils/logger';

async function main() {
  await connectDb(env.MONGODB_URI);
  await ensureUploadDir();

  const server = createApp().listen(env.PORT, '0.0.0.0', () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });
  const stopSweeper = startHoldSweeper(env.HOLD_SWEEP_INTERVAL_SECONDS);

  // Graceful shutdown: stop accepting connections, finish in-flight requests, close the pool.
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    stopSweeper();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
