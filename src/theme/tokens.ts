/**
 * Visual spec: `brand/CAREPAIR-VISUAL-SPEC.md`. Mirrors `brand/tokens.json`.
 * Coral primary CTA, yellow accents, green success, cool neutrals.
 */
export const colors = {
  screenBackground: '#FFFFFF',
  surfaceMuted: '#F7F9FC',
  surface: '#FFFFFF',
  border: '#EDF0F5',
  borderStrong: '#DDE2EB',
  text: '#1A2733',
  textSecondary: '#7A8A99',
  textSubtle: '#B0BCC8',
  textDisabled: '#B0BCC8',
  brandYellow: '#FFD84D',
  brandYellowTint: '#FFF3BA',
  brandYellowText: '#5A4200',
  success: '#3EC882',
  successTint: '#C0F0D8',
  successText: '#0A3D22',
  accentCoral: '#FF7052',
  accentCoralMid: '#FF8A6F',
  accentCoralTint: '#FFD4CB',
  accentCoralText: '#7A2010',
  focusRing: '#FFD84D',
  pressedBackground: '#F0F3F7',
  disabledBackground: '#EDF0F5',
  danger: '#C94A4A',
  warning: '#BA7517',
  /** Primary CTA / links / spinners (coral) */
  primary: '#FF7052',
  primaryMid: '#FF8A6F',
  primaryLight: '#FFD4CB',
  /** Selected chips, soft highlights (yellow tint) */
  primaryMuted: '#FFF3BA',
  /** Emphasis on light surfaces (same as text) */
  primaryDark: '#1A2733',
  accent: '#FF7052',
  accentLight: '#FFD4CB',
  accentDark: '#E85A3C',
  background: '#FFFFFF',
  logoNeutral: '#FF7052',
  darkSurface: '#1A2332',
  darkBackground: '#0F1419',
  onPrimary: '#FFFFFF',
  mapSearchRadiusFill: 'rgba(62, 200, 130, 0.18)',
  shadowInk: '#1A2733',
  overlayScrim: 'rgba(0, 0, 0, 0.5)',
  onImageText: '#FFFFFF',
  onImageTextMuted: 'rgba(255, 255, 255, 0.92)',
  textShadowOnImage: 'rgba(0, 0, 0, 0.35)',
  swipeHintLikeFill: 'rgba(62, 200, 130, 0.14)',
  swipeHintPassFill: 'rgba(122, 138, 153, 0.08)',
} as const;

export type CarePairPalette = { [K in keyof typeof colors]: string };

/** Dark appearance — same semantic keys. */
export const darkColors: CarePairPalette = {
  screenBackground: '#0F1419',
  surfaceMuted: '#151C28',
  surface: '#1A2332',
  border: 'rgba(232, 237, 245, 0.12)',
  borderStrong: 'rgba(232, 237, 245, 0.22)',
  text: '#E8EDF5',
  textSecondary: '#9CA8B8',
  textSubtle: '#6B7788',
  textDisabled: '#5A6575',
  brandYellow: '#E8C44A',
  brandYellowTint: '#3A3420',
  brandYellowText: '#F5E6A8',
  success: '#4CD998',
  successTint: '#1A3D2E',
  successText: '#B8F0D4',
  accentCoral: '#FF8A72',
  accentCoralMid: '#FFA48F',
  accentCoralTint: '#4A2820',
  accentCoralText: '#FFD4CB',
  focusRing: '#E8C44A',
  pressedBackground: '#242D3D',
  disabledBackground: '#1F2836',
  danger: '#F08080',
  warning: '#D4A054',
  primary: '#FF8A72',
  primaryMid: '#FFA48F',
  primaryLight: '#4A2820',
  primaryMuted: '#3A3420',
  primaryDark: '#E8EDF5',
  accent: '#FF8A72',
  accentLight: '#4A2820',
  accentDark: '#FFB09E',
  background: '#0F1419',
  logoNeutral: '#FF8A72',
  darkSurface: '#1A2332',
  darkBackground: '#0F1419',
  onPrimary: '#FFFFFF',
  mapSearchRadiusFill: 'rgba(76, 217, 152, 0.22)',
  shadowInk: '#000000',
  overlayScrim: 'rgba(0, 0, 0, 0.6)',
  onImageText: '#FFFFFF',
  onImageTextMuted: 'rgba(255, 255, 255, 0.92)',
  textShadowOnImage: 'rgba(0, 0, 0, 0.45)',
  swipeHintLikeFill: 'rgba(76, 217, 152, 0.2)',
  swipeHintPassFill: 'rgba(232, 237, 245, 0.08)',
};

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

export const layout = {
  screenPaddingX: 20,
  screenPaddingY: 16,
  sectionGap: 24,
  listRowMinHeight: 52,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
} as const;
