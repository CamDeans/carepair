import * as Sentry from '@sentry/react-native';

const sentryInDev = process.env.EXPO_PUBLIC_SENTRY_DEBUG === '1';

/**
 * Central hook for crash reporting. Uses Sentry when configured (`EXPO_PUBLIC_SENTRY_DSN`).
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const msg = error instanceof Error ? error.message : String(error);
  if (__DEV__ && !sentryInDev) {
    console.warn('[reportError]', msg, context, error);
    return;
  }

  const err = error instanceof Error ? error : new Error(msg);
  Sentry.captureException(err, context ? { extra: context } : undefined);
  console.error('[reportError]', msg, context, error);
}
