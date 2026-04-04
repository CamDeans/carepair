import type { MeUser } from '@/src/lib/serverApi';
import { effectiveConsumerPersona } from '@/src/lib/effectivePersona';

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function photoFromProfile(profile: Record<string, unknown> | null | undefined): string | null {
  if (!profile) return null;
  const urls = profile.photoUrls;
  if (!Array.isArray(urls)) return null;
  const list = urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  if (list.length === 0) return null;
  const pi = typeof profile.primaryPhotoIndex === 'number' ? profile.primaryPhotoIndex : 0;
  const safe = Math.max(0, Math.min(list.length - 1, pi));
  return list[safe] ?? null;
}

export function meProfilePreview(user: MeUser | null | undefined): {
  displayName: string;
  photoUri: string | null;
  roleLabel: string;
} | null {
  if (!user) return null;
  const persona = effectiveConsumerPersona(user);
  const fp = user.familyProfile as Record<string, unknown> | null | undefined;
  const cp = user.caregiverProfile as Record<string, unknown> | null | undefined;
  if (persona === 'family') {
    return {
      displayName: str(fp?.displayName) || 'Family',
      photoUri: photoFromProfile(fp),
      roleLabel: 'Family',
    };
  }
  if (persona === 'caregiver') {
    return {
      displayName: str(cp?.displayName) || 'Caregiver',
      photoUri: photoFromProfile(cp),
      roleLabel: 'Caregiver',
    };
  }
  return {
    displayName: user.email?.split('@')[0] ?? 'Account',
    photoUri: null,
    roleLabel: 'Account',
  };
}
