import { API_REQUEST_TIMEOUT_MS } from '@/src/constants/app';
import { logger } from '@/src/lib/logger';

export type ApiErrorMeta = {
  requestId?: string;
  /** Present when API sets GOOGLE_AUTH_RETURN_VERIFY_ERROR (staging). */
  verifyError?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown,
    public readonly meta?: ApiErrorMeta,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type HttpJsonOptions = RequestInit & {
  timeoutMs?: number;
};

export async function httpJson<T>(url: string, options: HttpJsonOptions = {}): Promise<T> {
  const { timeoutMs = API_REQUEST_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });

    const text = await res.text();
    let data: unknown = null;
    if (text.length) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        throw new ApiError('Invalid response from server', res.status);
      }
    }

    if (!res.ok) {
      const msg =
        typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message: unknown }).message === 'string'
          ? (data as { message: string }).message
          : `Request failed (${res.status})`;
      const meta: ApiErrorMeta = {};
      if (typeof data === 'object' && data !== null) {
        const o = data as Record<string, unknown>;
        if (typeof o.requestId === 'string' && o.requestId.trim()) meta.requestId = o.requestId.trim();
        if (typeof o.verifyError === 'string' && o.verifyError.trim()) meta.verifyError = o.verifyError.trim();
      }
      throw new ApiError(msg, res.status, undefined, Object.keys(meta).length ? meta : undefined);
    }

    return (data ?? (undefined as T)) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError('Request timed out. Check your connection.', undefined, e);
    }
    if (e instanceof Error) {
      const m = e.message.toLowerCase();
      if (
        m.includes('network request failed') ||
        m.includes('failed to fetch') ||
        m.includes('load failed') ||
        m.includes('internet connection appears to be offline')
      ) {
        throw new ApiError('No internet connection. Check Wi-Fi or mobile data, then try again.', undefined, e);
      }
    }
    logger.error('httpJson', e);
    throw new ApiError('Network error. Try again.', undefined, e);
  } finally {
    clearTimeout(timeout);
  }
}
