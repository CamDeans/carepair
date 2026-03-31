import { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** When `onPress` is set, announced by screen readers (recommended for list rows). */
  accessibilityLabel?: string;
};

export function Card({ children, onPress, style, accessibilityLabel }: Props) {
  const { colors: c, reduceMotion } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: c.border,
          shadowColor: c.shadowInk,
          shadowOpacity: 0.07,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        pressed: { opacity: 0.92 },
      }),
    [c],
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && !reduceMotion && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}
