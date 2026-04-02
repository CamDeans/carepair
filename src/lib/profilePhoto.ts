/** Mirrors server `pickProfilePhotoUri` for client-side display from `/users/:id` payloads. */
export function pickProfilePhotoUri(profile: Record<string, unknown> | null | undefined): string | null {
  if (!profile) return null;
  const raw = profile.photoUrls;
  const urls = Array.isArray(raw)
    ? raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    : [];
  if (urls.length === 0) return null;
  const pi = profile.primaryPhotoIndex;
  const rawIdx = typeof pi === 'number' && !Number.isNaN(pi) ? pi : 0;
  const idx = Math.min(Math.max(0, rawIdx), urls.length - 1);
  return urls[idx] ?? null;
}
