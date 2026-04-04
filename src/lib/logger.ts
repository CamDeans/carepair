/**
 * Logs in development, or in release builds when `EXPO_PUBLIC_VERBOSE_CLIENT_LOGS=1` (internal / TestFlight debugging).
 * Never pass tokens or passwords as arguments.
 */
const verboseClientLogs = process.env.EXPO_PUBLIC_VERBOSE_CLIENT_LOGS === '1';
const logToConsole = __DEV__ || verboseClientLogs;

export const logger = {
  debug: (...args: unknown[]) => {
    if (logToConsole) console.log('[CarePair]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (logToConsole) console.warn('[CarePair]', ...args);
  },
  error: (...args: unknown[]) => {
    if (logToConsole) console.error('[CarePair]', ...args);
  },
};
