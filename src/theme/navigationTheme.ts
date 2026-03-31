/**
 * React Navigation themes aligned with brand/CAREPAIR-VISUAL-SPEC.md (light + dark).
 * Wire into `app/_layout.tsx` ThemeProvider.
 */
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import { colors, darkColors } from '@/src/theme/tokens';

export const carePairLightNavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export const carePairDarkNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.accent,
  },
};
