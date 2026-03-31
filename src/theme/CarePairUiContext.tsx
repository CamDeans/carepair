import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

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
};

const CarePairUiContext = createContext<CarePairUiValue | null>(null);

export function CarePairUiProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
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

  const value = useMemo((): CarePairUiValue => {
    const palette = scheme === 'dark' ? darkColors : colors;
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
    return { colors: palette, fonts, fontsLoaded, reduceMotion, motion };
  }, [scheme, fontsLoaded, reduceMotion]);

  return <CarePairUiContext.Provider value={value}>{children}</CarePairUiContext.Provider>;
}

export function useCarePairUi(): CarePairUiValue {
  const ctx = useContext(CarePairUiContext);
  if (!ctx) {
    throw new Error('useCarePairUi must be used within CarePairUiProvider');
  }
  return ctx;
}

/** Safe outside CarePairUiProvider (e.g. error boundary) — light/dark from system only. */
export function usePaletteOnly(): CarePairPalette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : colors;
}
