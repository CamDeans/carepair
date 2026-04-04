import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { pingServerHealth } from '@/src/lib/serverHealth';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function SystemHealthScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [loading, setLoading] = useState(true);
  const [line, setLine] = useState<string | null>(null);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.md },
      body: { ...t.body, marginBottom: layout.sectionGap },
      card: {
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: spacing.md,
        minHeight: 88,
        justifyContent: 'center',
        shadowColor: c.shadowInk,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
        elevation: 4,
      },
      status: { ...t.lead, fontFamily: f.semibold },
      hint: { ...t.caption, marginTop: spacing.sm },
    });
  }, [c, f]);

  const run = useCallback(async () => {
    setLoading(true);
    setLine(null);
    try {
      const r = await pingServerHealth();
      if (r.ok) {
        setLine(`Connected · ${r.ms} ms`);
      } else {
        setLine(`Unavailable · ${r.error}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void run();
    }, [run]),
  );

  return (
    <Screen scroll>
      <Text style={styles.h1}>Service status</Text>
      <Text style={styles.body}>Shows whether CarePair can reach your server right now.</Text>
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <Text style={styles.status}>{line ?? '—'}</Text>
        )}
        <Text style={styles.hint}>Requires internet access.</Text>
      </View>
      <Button title={loading ? 'Checking…' : 'Check again'} onPress={() => void run()} disabled={loading} />
    </Screen>
  );
}
