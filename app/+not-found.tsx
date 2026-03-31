import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

export default function NotFoundScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          backgroundColor: c.background,
        },
        title: {
          fontSize: 20,
          fontWeight: '600',
          letterSpacing: -0.3,
          color: c.text,
          fontFamily: f.semibold,
        },
        link: {
          marginTop: spacing.md,
          paddingVertical: spacing.md,
        },
        linkText: {
          fontSize: 15,
          fontWeight: '500',
          color: c.primary,
          fontFamily: f.medium,
        },
      }),
    [c, f],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
