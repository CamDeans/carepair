/**
 * Logs only in development. Never pass tokens or passwords as arguments.
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (__DEV__) console.log('[CarePair]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn('[CarePair]', ...args);
  },
  error: (...args: unknown[]) => {
    if (__DEV__) console.error('[CarePair]', ...args);
  },
};
