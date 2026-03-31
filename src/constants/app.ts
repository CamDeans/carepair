/** Persist hydration: unblock gate if listener misses (see app/index.tsx). */
export const HYDRATION_FALLBACK_MS = 2500;

/** HTTP timeout for API calls (native apps on slow networks). */
export const API_REQUEST_TIMEOUT_MS = 25_000;

/** Care note body max length (server should enforce the same). */
export const CARE_NOTE_MAX_LENGTH = 2000;

/** Connection request intro max length. */
export const CONNECTION_INTRO_MAX_LENGTH = 500;
