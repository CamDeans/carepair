import type { TextStyle } from 'react-native';

import type { CarePairFonts } from '@/src/theme/CarePairUiContext';
import { spacing, type CarePairPalette } from '@/src/theme/tokens';

/**
 * CAREPAIR-VISUAL-SPEC.md — headings 600 / -0.02em / ~1.15 lh; body 400 / ~1.65 lh; labels 500 / 0.01em ls.
 * Use via `createTypographyStyles(colors, fonts)` inside `useMemo` when `fontsLoaded` is true.
 */
export function createTypographyStyles(c: CarePairPalette, f: CarePairFonts) {
  const screenTitle: TextStyle = {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.56,
    lineHeight: 32,
    color: c.text,
    fontFamily: f.semibold,
  };
  const sectionTitle: TextStyle = {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    lineHeight: 24,
    color: c.text,
    fontFamily: f.semibold,
  };
  const lead: TextStyle = {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
    color: c.text,
    fontFamily: f.regular,
  };
  const body: TextStyle = {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    color: c.text,
    fontFamily: f.regular,
  };
  const bodySecondary: TextStyle = {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    color: c.textSecondary,
    fontFamily: f.regular,
  };
  const sub: TextStyle = {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 24,
    color: c.textSecondary,
    fontFamily: f.regular,
  };
  const caption: TextStyle = {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    color: c.textSecondary,
    fontFamily: f.regular,
  };
  const label: TextStyle = {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.14,
    lineHeight: 18,
    color: c.text,
    fontFamily: f.medium,
  };
  const link: TextStyle = {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    color: c.primary,
    fontFamily: f.medium,
  };
  /** Profile / detail section labels — spec: headings 600, sentence case (no uppercase). */
  const profileSectionLabel: TextStyle = {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.26,
    lineHeight: 18,
    color: c.text,
    marginBottom: spacing.sm,
    fontFamily: f.semibold,
  };
  /** Name on photo overlay (Discover card) — 600 per visual spec. */
  const heroOverlayName: TextStyle = {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    color: c.onImageText,
    fontFamily: f.semibold,
    textShadowColor: c.textShadowOnImage,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };

  return {
    screenTitle,
    sectionTitle,
    lead,
    body,
    bodySecondary,
    sub,
    caption,
    label,
    link,
    profileSectionLabel,
    heroOverlayName,
  } as const;
}
