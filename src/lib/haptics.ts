import * as Haptics from 'expo-haptics';

export async function hapticImpactLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* simulator / unsupported */
  }
}

export async function hapticImpactMedium(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    /* simulator / unsupported */
  }
}
