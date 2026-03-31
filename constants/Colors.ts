/**
 * Legacy hook for `components/Themed.tsx` (Expo template). Aligned with `src/theme/tokens.ts`.
 */
import { colors, darkColors } from '@/src/theme/tokens';

export default {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    tabIconDefault: colors.textSubtle,
    tabIconSelected: colors.primary,
  },
  dark: {
    text: darkColors.text,
    background: darkColors.background,
    tint: darkColors.primaryMid,
    tabIconDefault: darkColors.textSubtle,
    tabIconSelected: darkColors.primaryMid,
  },
};
