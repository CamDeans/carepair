/**
 * Type scale per brand/CAREPAIR-VISUAL-SPEC.md — headings 600, labels 500, body 400.
 * Apply `fontFamily` from CarePairUi when fonts are loaded.
 */
import type { TextStyle } from 'react-native';

export type FontFaces = {
  regular: string | undefined;
  medium: string | undefined;
  semibold: string | undefined;
};

export function withFont(style: TextStyle, face: keyof FontFaces, fonts: FontFaces): TextStyle {
  const name = fonts[face];
  if (!name) return style;
  return { ...style, fontFamily: name };
}

/** Base text styles (weights follow spec; merge fontFamily in screens/components). */
export const typeScale = {
  display: { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.56, lineHeight: 34 },
  title: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.48, lineHeight: 30 },
  h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.44, lineHeight: 28 },
  subtitle: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.36, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.14, lineHeight: 18 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  micro: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
} as const;
