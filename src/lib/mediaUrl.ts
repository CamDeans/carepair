import { getApiBaseUrl } from '@/src/lib/config';

/**
 * Turn stored profile/upload URLs into a loadable absolute URI in the app.
 * - Already absolute `http(s)://` → unchanged
 * - Root-relative `/uploads/...` → prefixed with API host (strip trailing `/api` from `EXPO_PUBLIC_API_URL`)
 */
export function resolveMediaUri(uri: string | null | undefined): string | null {
  const t = uri?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const rawBase = getApiBaseUrl().replace(/\/$/, '');
  const origin = rawBase.replace(/\/api$/i, '');
  if (!origin) return t;
  if (t.startsWith('/')) return `${origin}${t}`;
  return `${origin}/${t}`;
}
