import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { radius, spacing } from '@/src/theme/tokens';

type Props = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function InlineError({ message, onRetry, retryLabel = 'Try again' }: Props) {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      box: {
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.danger,
        backgroundColor: c.surface,
        marginBottom: spacing.md,
      },
      text: { ...t.caption, color: c.danger, fontFamily: f.medium },
      retry: { marginTop: spacing.sm },
    });
  }, [c, f]);

  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <View style={styles.retry}>
          <Button title={retryLabel} variant="secondary" size="sm" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
