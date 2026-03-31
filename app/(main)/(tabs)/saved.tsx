import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { DiscoverCard } from '@/src/components/DiscoverCard';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

export default function SavedScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [items, setItems] = useState<api.DiscoverCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: { fontSize: 28, fontWeight: '800', color: c.text, fontFamily: f.semibold },
        sub: {
          fontSize: 15,
          color: c.textSecondary,
          marginBottom: spacing.md,
          marginTop: spacing.xs,
          fontFamily: f.regular,
        },
        empty: { fontSize: 15, color: c.textSecondary, lineHeight: 22, fontFamily: f.regular },
        err: { color: c.danger, marginBottom: spacing.sm, fontFamily: f.regular },
      }),
    [c, f],
  );

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { results } = await api.profileSavedList();
        if (!cancelled) setItems(results);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  const cards = items.map((item) => ({
    id: item.id,
    title: item.displayName ?? 'User',
    subtitle: [item.city, item.snippet].filter(Boolean).join(' · '),
    imageUri: item.photoUri,
    href: item.role === 'family' ? (`/family/${item.id}` as const) : (`/caregiver/${item.id}` as const),
  }));

  return (
    <Screen scroll>
      <Text style={styles.h1}>Saved</Text>
      <Text style={styles.sub}>Profiles you bookmarked from Discover.</Text>
      {loading ? <ActivityIndicator color={c.primary} /> : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {!loading && cards.length === 0 ? (
        <Text style={styles.empty}>No saved profiles yet. Use the heart on a profile or swipe deck.</Text>
      ) : (
        cards.map((item) => (
          <DiscoverCard
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            imageUri={item.imageUri}
            onPress={() => router.push(item.href)}
          />
        ))
      )}
    </Screen>
  );
}
