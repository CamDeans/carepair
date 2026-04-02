import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { DiscoverCard } from '@/src/components/DiscoverCard';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, spacing } from '@/src/theme/tokens';

export default function SavedScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [items, setItems] = useState<api.DiscoverCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.xs },
      sub: { ...t.sub, marginBottom: layout.sectionGap - spacing.sm, marginTop: spacing.xs },
      empty: { ...t.bodySecondary },
      err: { ...t.caption, color: c.danger, marginBottom: spacing.sm },
    });
  }, [c, f]);

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

  const cards = items.map((item) => {
    const dist = item.distanceKm != null ? `${item.distanceKm} km` : '';
    const subtitle = [item.city, item.snippet, dist].filter(Boolean).join(' · ');
    return {
      id: item.id,
      title: item.displayName ?? 'User',
      subtitle,
      imageUri: item.photoUri,
      href: item.role === 'family' ? (`/family/${item.id}` as const) : (`/caregiver/${item.id}` as const),
    };
  });

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
