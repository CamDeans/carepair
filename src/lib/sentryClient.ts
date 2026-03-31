import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const sentryInDev = process.env.EXPO_PUBLIC_SENTRY_DEBUG === '1';
const enabled = Boolean(dsn) && (!__DEV__ || sentryInDev);

/** Always call `init` so `Sentry.wrap` in the root layout does not warn when DSN is unset. */
Sentry.init({
  dsn: dsn || undefined,
  enabled,
  sendDefaultPii: false,
  tracesSampleRate: __DEV__ ? 1 : 0.12,
  enableAutoSessionTracking: enabled,
  debug: __DEV__ && sentryInDev && enabled,
});
