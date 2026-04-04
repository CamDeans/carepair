import { getApiServerOrigin } from '@/src/lib/config';

export type HealthPingResult =
  | { ok: true; ms: number }
  | { ok: false; error: string };

const HEALTH_TIMEOUT_MS = 12_000;

/** GET /health on the API host (no auth). Origin is derived from `EXPO_PUBLIC_API_URL`. */
export async function pingServerHealth(): Promise<HealthPingResult> {
  const origin = getApiServerOrigin();
  if (!origin) {
    return { ok: false, error: 'Not configured' };
  }
  const url = `${origin}/health`;
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    const ms = Date.now() - start;
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true, ms };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: 'Timed out' };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
