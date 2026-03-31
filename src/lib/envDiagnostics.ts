import { getApiBaseUrl, getExtra, getStripePortalUrl } from '@/src/lib/config';
import { logger } from '@/src/lib/logger';

function isHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Dev / preview diagnostics only. Call once from root layout after splash.
 */
export function logEnvDiagnostics(): void {
  if (!__DEV__) return;

  const api = getApiBaseUrl();
  const portal = getStripePortalUrl();
  const extra = getExtra();

  if (api && !isHttpUrl(api)) {
    logger.warn('EXPO_PUBLIC_API_URL should be a valid http(s) URL');
  }

  if (portal && !isHttpsUrl(portal)) {
    logger.warn('EXPO_PUBLIC_STRIPE_PORTAL_URL should use https in production');
  }

  const easId = extra.eas?.projectId;
  if (easId === '00000000-0000-0000-0000-000000000000') {
    logger.warn('Set a real EAS project id in app.config / env before store builds');
  }

  if (!api) {
    logger.debug('API: mock mode (no EXPO_PUBLIC_API_URL)');
  }
}
