import { useMemo } from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';

const MARK_VB = 64;

/**
 * Pair mark — geometry must stay aligned with `brand/logo-mark.svg` and `landing/public/brand/logo-mark.svg`.
 */
export function LogoMark({ size = 40, importantForAccessibility = 'yes' }: { size?: number; importantForAccessibility?: 'yes' | 'no' }) {
  const { colors: c } = useCarePairUi();
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${MARK_VB} ${MARK_VB}`}
      accessible={importantForAccessibility === 'yes'}
      accessibilityRole="image"
      accessibilityLabel={importantForAccessibility === 'yes' ? 'CarePair' : undefined}>
      <Rect width={64} height={64} rx={14} fill={c.primaryMuted} />
      <Circle cx={26} cy={32} r={13} fill={c.accentCoral} opacity={0.95} />
      <Circle cx={38} cy={32} r={13} fill={c.text} opacity={0.88} />
    </Svg>
  );
}

type BrandLogoProps = {
  /** Header center title — tighter spacing */
  variant?: 'default' | 'header';
  /** Tap target (e.g. wrap in Link later) */
  onPress?: () => void;
  /** Hide “CarePair” word */
  hideWordmark?: boolean;
};

export function BrandLogo({ variant = 'default', onPress, hideWordmark = false }: BrandLogoProps) {
  const { colors: c, fonts: f } = useCarePairUi();
  const markSize = variant === 'header' ? 32 : 40;
  const wordSize = variant === 'header' ? 17 : 20;

  const wordStyle = useMemo(
    () => ({
      fontWeight: '600' as const,
      color: c.text,
      letterSpacing: -0.5,
      fontFamily: f.semibold,
    }),
    [c.text, f.semibold],
  );

  const inner = (
    <View
      style={[styles.row, variant === 'header' && styles.rowHeader]}
      accessible
      accessibilityRole="text"
      accessibilityLabel="CarePair">
      <LogoMark size={markSize} importantForAccessibility="no" />
      {!hideWordmark ? (
        <Text
          style={[wordStyle, { fontSize: wordSize }, variant === 'header' && styles.wordmarkHeader]}
          numberOfLines={variant === 'header' ? 1 : undefined}
          ellipsizeMode="tail">
          CarePair
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="CarePair home">
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%' },
  rowHeader: { gap: 8, minWidth: 0 },
  wordmarkHeader: { flexShrink: 1 },
});
