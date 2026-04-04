import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { ProfilePhoto } from '@/src/components/ui/ProfilePhoto';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
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
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      card: { marginBottom: spacing.md },
      row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
      avatar: { width: 56, height: 56, borderRadius: radius.md },
      body: { flex: 1, minWidth: 0 },
      title: { ...t.lead, fontWeight: '600', fontFamily: f.semibold },
      sub: { ...t.caption, marginTop: spacing.xs },
      badge: {
        backgroundColor: c.primaryMuted,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
      },
      badgeText: {
        fontWeight: '600',
        color: c.brandYellowText,
        fontSize: 13,
        fontFamily: f.semibold,
      },
    });
  }, [c, f]);

  return (
    <Card
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${title}. ${subtitle}${compatibility != null ? `. ${compatibility} percent match` : ''}`}>
      <View style={styles.row}>
        <ProfilePhoto uri={imageUri} style={styles.avatar} accessibilityLabel={`${title} photo`} />
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
