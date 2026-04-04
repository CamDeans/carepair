import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import { useUiPreferencesStore, type AppearancePreference } from '@/src/store/uiPreferencesStore';
import { colors, darkColors, motion as motionTokens, type CarePairPalette } from '@/src/theme/tokens';

export type CarePairFonts = {
  regular: string | undefined;
  medium: string | undefined;
  semibold: string | undefined;
};

export type CarePairMotion = {
  ease: (typeof motionTokens)['ease'];
  fastMs: number;
  baseMs: number;
};

type CarePairUiValue = {
  colors: CarePairPalette;
  fonts: CarePairFonts;
  fontsLoaded: boolean;
  /** OS “reduce motion” — skip non-essential transforms / use zero-duration UI timing. */
  reduceMotion: boolean;
  motion: CarePairMotion;
  /** Resolved light/dark after applying user appearance preference. */
  resolvedScheme: 'light' | 'dark';
  appearance: AppearancePreference;
  setAppearance: (a: AppearancePreference) => void;
};

const CarePairUiContext = createContext<CarePairUiValue | null>(null);

function resolveScheme(
  appearance: AppearancePreference,
  system: 'light' | 'dark' | null | undefined,
): 'light' | 'dark' {
  if (appearance === 'light') return 'light';
  if (appearance === 'dark') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}

export function CarePairUiProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const appearance = useUiPreferencesStore((s) => s.appearance);
  const setAppearance = useUiPreferencesStore((s) => s.setAppearance);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
  });

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);

  const resolvedScheme = useMemo(
    () => resolveScheme(appearance, systemScheme),
    [appearance, systemScheme],
  );

  const value = useMemo((): CarePairUiValue => {
    const palette = resolvedScheme === 'dark' ? darkColors : colors;
    const fonts: CarePairFonts = fontsLoaded
      ? {
          regular: 'PlusJakartaSans_400Regular',
          medium: 'PlusJakartaSans_500Medium',
          semibold: 'PlusJakartaSans_600SemiBold',
        }
      : { regular: undefined, medium: undefined, semibold: undefined };
    const motion: CarePairMotion = reduceMotion
      ? { ease: motionTokens.ease, fastMs: 0, baseMs: 0 }
      : { ease: motionTokens.ease, fastMs: motionTokens.fastMs, baseMs: motionTokens.baseMs };
    return {
      colors: palette,
      fonts,
      fontsLoaded,
      reduceMotion,
      motion,
      resolvedScheme,
      appearance,
      setAppearance,
    };
  }, [resolvedScheme, fontsLoaded, reduceMotion, appearance, setAppearance]);

  return <CarePairUiContext.Provider value={value}>{children}</CarePairUiContext.Provider>;
}

export function useCarePairUi(): CarePairUiValue {
  const ctx = useContext(CarePairUiContext);
  if (!ctx) {
    throw new Error('useCarePairUi must be used within CarePairUiProvider');
  }
  return ctx;
}

/** Safe outside CarePairUiProvider (e.g. error boundary) — follows system appearance only. */
export function usePaletteOnly(): CarePairPalette {
  const systemScheme = useColorScheme();
  return systemScheme === 'dark' ? darkColors : colors;
}
