import type { MeUser } from '@/src/lib/serverApi';

export type ConsumerPersona = 'family' | 'caregiver';

/** Mirrors server `effectiveConsumerRole` for JWT `role` + tester persona. */
export function effectiveConsumerPersona(
  user: Pick<MeUser, 'role' | 'valuedTesterPersona'> | null | undefined,
): ConsumerPersona | null {
  if (!user) return null;
  if (user.role === 'family' || user.role === 'caregiver') return user.role;
  if (user.role === 'valued_tester') {
    const p = user.valuedTesterPersona;
    if (p === 'family' || p === 'caregiver') return p;
    return 'family';
  }
  return null;
}
