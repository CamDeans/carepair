/**
 * Visual spec: `brand/CAREPAIR-VISUAL-SPEC.md` — Warm Sage + Terracotta. Mirrors `brand/tokens.json`.
 */
export const colors = {
  primary: '#2D6A50',
  primaryMid: '#4A9B74',
  primaryLight: '#D8F0E4',
  /** Alias for chips / avatars (same as primaryLight) */
  primaryMuted: '#D8F0E4',
  primaryDark: '#1A3D2E',
  accent: '#D85A30',
  accentLight: '#FAECE7',
  accentDark: '#993C1D',
  background: '#FBF9F6',
  surface: '#FFFFFF',
  text: '#2C2C2A',
  textSecondary: '#5F5E5A',
  textSubtle: '#B4B2A9',
  border: 'rgba(44, 44, 42, 0.1)',
  borderStrong: 'rgba(44, 44, 42, 0.2)',
  danger: '#A32D2D',
  success: '#1D9E75',
  warning: '#BA7517',
  logoNeutral: '#D85A30',
  darkSurface: '#1C1C1A',
  darkBackground: '#111210',
  /** Text on primary / accent button labels */
  onPrimary: '#FFFFFF',
  /** Discover map search radius fill (sage @ ~14% alpha) */
  mapSearchRadiusFill: 'rgba(45, 106, 80, 0.14)',
  /** Card / sheet shadow base (RN uses separate shadowOpacity) */
  shadowInk: '#2C2C2A',
  /** Hero photo gradient / scrim (Discover swipe card) */
  overlayScrim: 'rgba(0, 0, 0, 0.5)',
  onImageText: '#FFFFFF',
  onImageTextMuted: 'rgba(255, 255, 255, 0.92)',
  textShadowOnImage: 'rgba(0, 0, 0, 0.35)',
  swipeHintLikeFill: 'rgba(45, 106, 80, 0.12)',
  swipeHintPassFill: 'rgba(44, 44, 42, 0.06)',
} as const;

export type CarePairPalette = { [K in keyof typeof colors]: string };

/** Dark appearance — same keys as `colors` (spec :root dark). */
export const darkColors: CarePairPalette = {
  primary: '#4A9B74',
  primaryMid: '#5DCAA5',
  primaryLight: '#0F3D28',
  primaryMuted: '#0F3D28',
  primaryDark: '#D8F0E4',
  accent: '#F0997B',
  accentLight: '#3D1A0E',
  accentDark: '#F0997B',
  background: '#111210',
  surface: '#1C1C1A',
  text: '#F1EFE8',
  textSecondary: '#B4B2A9',
  textSubtle: '#5F5E5A',
  border: 'rgba(241, 239, 232, 0.09)',
  borderStrong: 'rgba(241, 239, 232, 0.18)',
  danger: '#E87070',
  success: '#1D9E75',
  warning: '#BA7517',
  logoNeutral: '#F0997B',
  darkSurface: '#1C1C1A',
  darkBackground: '#111210',
  onPrimary: '#FFFFFF',
  mapSearchRadiusFill: 'rgba(74, 155, 116, 0.22)',
  shadowInk: '#000000',
  overlayScrim: 'rgba(0, 0, 0, 0.55)',
  onImageText: '#FFFFFF',
  onImageTextMuted: 'rgba(255, 255, 255, 0.92)',
  textShadowOnImage: 'rgba(0, 0, 0, 0.45)',
  swipeHintLikeFill: 'rgba(74, 155, 116, 0.2)',
  swipeHintPassFill: 'rgba(241, 239, 232, 0.08)',
};

/** Aligns with landing `--cp-ease` / durations. */
export const motion = {
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)' as const,
  fastMs: 140,
  baseMs: 220,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/**
 * Screen chrome — use with `Screen` and stack content so padding stays consistent app-wide.
 * Horizontal 20px hits a comfortable reading margin on phones (spec base is 16px body; edges slightly wider).
 */
export const layout = {
  screenPaddingX: 20,
  screenPaddingY: 16,
  /** Vertical gap between major sections (title block → content → actions). */
  sectionGap: 24,
  /** Minimum list row height for primary touch targets (WCAG-friendly). */
  listRowMinHeight: 52,
} as const;

/** Matches spec: sm 6, md 10, lg 16, xl 22, pill */
export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
} as const;
