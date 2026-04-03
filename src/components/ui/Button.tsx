import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: 'default' | 'sm' | 'lg';
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'default',
  style,
  accessibilityLabel,
}: Props) {
  const { colors: c, fonts: f, reduceMotion } = useCarePairUi();
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isAccent = variant === 'accent';
  const isDanger = variant === 'danger';
  const onDark = isPrimary || isAccent || isDanger;

  const styles = useMemo(() => {
    const labelBase = {
      fontSize: 15,
      fontWeight: '500' as const,
      lineHeight: 22,
      fontFamily: f.medium,
    };
    return StyleSheet.create({
      base: {
        minHeight: 44,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg + 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
      },
      baseSm: {
        minHeight: 40,
        paddingVertical: 8,
        paddingHorizontal: spacing.md,
      },
      baseLg: {
        minHeight: 48,
        paddingVertical: 14,
        paddingHorizontal: 32,
      },
      primary: {
        backgroundColor: c.primary,
        borderColor: c.primary,
      },
      secondary: {
        backgroundColor: 'transparent',
        borderColor: c.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
      accent: {
        backgroundColor: c.accent,
        borderColor: c.accent,
      },
      danger: {
        backgroundColor: c.danger,
        borderColor: c.danger,
      },
      disabled: { opacity: 0.7 },
      pressed: { transform: [{ scale: 0.975 }] },
      pressedPrimary: {
        backgroundColor: c.primaryMid,
        borderColor: c.primaryMid,
      },
      pressedAccent: {
        backgroundColor: c.accentDark,
        borderColor: c.accentDark,
      },
      pressedDanger: {
        opacity: 0.88,
      },
      label: { ...labelBase, color: c.text },
      labelSm: { fontSize: 13, fontFamily: f.medium },
      labelLg: { fontSize: 17, fontFamily: f.medium },
      labelOnPrimary: { ...labelBase, color: c.onPrimary },
      labelSecondary: { ...labelBase, color: c.primary },
      labelGhost: { ...labelBase, color: c.textSecondary },
    });
  }, [c, f.medium]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.baseSm,
        size === 'lg' && styles.baseLg,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        isAccent && styles.accent,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && !reduceMotion && styles.pressed,
        pressed && !disabled && !loading && isPrimary && styles.pressedPrimary,
        pressed && !disabled && !loading && isAccent && styles.pressedAccent,
        pressed && !disabled && !loading && isDanger && styles.pressedDanger,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={onDark ? c.onPrimary : c.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            size === 'sm' && styles.labelSm,
            size === 'lg' && styles.labelLg,
            isPrimary && styles.labelOnPrimary,
            isSecondary && styles.labelSecondary,
            isGhost && styles.labelGhost,
            isAccent && styles.labelOnPrimary,
            isDanger && styles.labelOnPrimary,
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
