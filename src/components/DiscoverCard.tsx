import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

type Props = {
  title: string;
  subtitle: string;
  /** When omitted, the match-strength badge is hidden (e.g. saved list). */
  compatibility?: number | null;
  imageUri: string | null;
  onPress: () => void;
};

export function DiscoverCard({ title, subtitle, compatibility, imageUri, onPress }: Props) {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.md },
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        avatar: { width: 56, height: 56, borderRadius: radius.md },
        avatarPh: {
          backgroundColor: c.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        phText: {
          fontSize: 22,
          fontWeight: '600',
          color: c.primaryDark,
          fontFamily: f.semibold,
        },
        body: { flex: 1 },
        title: {
          fontSize: 17,
          fontWeight: '600',
          color: c.text,
          fontFamily: f.semibold,
        },
        sub: { fontSize: 14, color: c.textSecondary, marginTop: 4, fontFamily: f.regular },
        badge: {
          backgroundColor: c.primaryMuted,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
        },
        badgeText: {
          fontWeight: '600',
          color: c.primaryDark,
          fontSize: 13,
          fontFamily: f.semibold,
        },
      }),
    [c, f],
  );

  return (
    <Card
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${title}. ${subtitle}${compatibility != null ? `. ${compatibility} percent match` : ''}`}>
      <View style={styles.row}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPh]}>
            <Text style={styles.phText}>{title.slice(0, 1)}</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {compatibility != null ? (
          <View style={styles.badge} importantForAccessibility="no">
            <Text style={styles.badgeText}>{compatibility}%</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
