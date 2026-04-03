import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { spacing } from '@/src/theme/tokens';

type Action = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
};

type Props = {
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  children?: ReactNode;
};

export function EmptyState({ title, description, primaryAction, secondaryAction, children }: Props) {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      wrap: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
      },
      title: { ...t.sectionTitle, fontSize: 18, lineHeight: 24, textAlign: 'center', marginBottom: spacing.xs },
      desc: { ...t.bodySecondary, textAlign: 'center', marginBottom: spacing.lg },
      actions: { width: '100%', gap: spacing.sm, marginTop: spacing.xs },
    });
  }, [c, f]);

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.desc} accessibilityRole="text">
          {description}
        </Text>
      ) : null}
      {children}
      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {primaryAction ? (
            <Button
              title={primaryAction.title}
              onPress={primaryAction.onPress}
              variant={primaryAction.variant ?? 'primary'}
            />
          ) : null}
          {secondaryAction ? (
            <Button
              title={secondaryAction.title}
              onPress={secondaryAction.onPress}
              variant={secondaryAction.variant ?? 'ghost'}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
