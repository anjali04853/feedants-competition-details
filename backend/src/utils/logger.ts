import pino from 'pino';

/** Pretty logs only in local development, and only if the dev dependency is installed. */
function prettyAvailable(): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL ?? 'info',
  ...(prettyAvailable() && { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});
