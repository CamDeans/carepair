import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  stripeCustomerPortalUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  googleMapsIosConfigured?: boolean;
  googleMapsAndroidConfigured?: boolean;
  eas?: { projectId?: string };
};

export function getExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

/** Full API root including `/api` e.g. `http://192.168.1.10:3001/api` */
export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? getExtra().apiBaseUrl ?? '';
}

/** Server origin without `/api` — for `/health` and similar non-API routes. */
export function getApiServerOrigin(): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  if (!base) return '';
  return base.replace(/\/api$/, '');
}

export function requireApiBase(): string {
  const b = getApiBaseUrl().replace(/\/$/, '');
  if (!b) throw new Error('Set EXPO_PUBLIC_API_URL to your server (e.g. http://IP:3001/api)');
  return b;
}

export function getStripePortalUrl(): string {
  return process.env.EXPO_PUBLIC_STRIPE_PORTAL_URL ?? getExtra().stripeCustomerPortalUrl ?? '';
}

export function getGoogleWebClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? getExtra().googleWebClientId ?? '';
}

export function getGoogleIosClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? getExtra().googleIosClientId ?? '';
}

export function getGoogleAndroidClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? getExtra().googleAndroidClientId ?? '';
}

/** Whether `GOOGLE_MAPS_ANDROID_API_KEY` was set at prebuild (release maps on Android). */
export function isGoogleMapsAndroidConfigured(): boolean {
  return getExtra().googleMapsAndroidConfigured === true;
}

/** Public Terms of Service URL (WebView or browser). */
export function getTermsUrl(): string {
  return process.env.EXPO_PUBLIC_TERMS_URL?.trim() ?? '';
}

/** Public Privacy Policy URL. */
export function getPrivacyUrl(): string {
  return process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() ?? '';
}

/** Sent with registration for audit trail (e.g. `2026-04-03` or policy URL). */
export function getTermsVersionLabel(): string {
  return process.env.EXPO_PUBLIC_TERMS_VERSION?.trim() ?? '2026-04-03';
}
