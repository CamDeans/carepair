import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { reportError } from '@/src/lib/reportError';
import { usePaletteOnly } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

/**
 * Expo Router root `ErrorBoundary` contract: `{ error, retry }`.
 * Uses `usePaletteOnly` (no CarePairUiProvider) because the boundary may mount outside that tree.
 */
export function RootErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const c = usePaletteOnly();

  useEffect(() => {
    reportError(error, { source: 'RootErrorBoundary' });
  }, [error]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        inner: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
        title: {
          fontSize: 22,
          fontWeight: '600',
          color: c.text,
          marginBottom: spacing.md,
          letterSpacing: -0.44,
        },
        msg: { fontSize: 15, lineHeight: 22, color: c.textSecondary, marginBottom: spacing.xl },
        btn: {
          alignSelf: 'flex-start',
          minHeight: 44,
          justifyContent: 'center',
          backgroundColor: c.primary,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
        },
        btnPressed: { opacity: 0.88 },
        btnText: { color: c.onPrimary, fontWeight: '600', fontSize: 16 },
      }),
    [c],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.inner}>
        <Text style={styles.title} accessibilityRole="header">
          Something went wrong
        </Text>
        <Text style={styles.msg} accessibilityRole="alert" selectable>
          {__DEV__
            ? error.message
            : 'Please try again. If this continues, update the app or contact support.'}
        </Text>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Try again">
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
