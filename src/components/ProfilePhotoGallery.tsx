import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { ProfilePhoto } from '@/src/components/ui/ProfilePhoto';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

type Props = {
  urls: string[];
  /** Height of each tile in the horizontal strip */
  tileHeight?: number;
  accessibilityPrefix?: string;
};

/**
 * Horizontal gallery of profile photos for full profile / discover detail views.
 */
export function ProfilePhotoGallery({ urls, tileHeight = 168, accessibilityPrefix = 'Profile' }: Props) {
  const { colors: c } = useCarePairUi();
  const { width: winW } = useWindowDimensions();
  const tileW = Math.min(280, Math.max(200, winW - spacing.lg * 2));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexGrow: 0 },
        tile: {
          width: tileW,
          height: tileHeight,
          borderRadius: radius.lg,
          marginRight: spacing.sm,
          borderWidth: 1,
          borderColor: c.border,
        },
      }),
    [c.border, tileW, tileHeight],
  );

  const filled = urls.map((u) => u.trim()).filter(Boolean);
  if (filled.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="scrollbar"
      accessibilityLabel={`${accessibilityPrefix} photos`}>
      {filled.map((uri, i) => (
        <ProfilePhoto
          key={`${uri}-${i}`}
          uri={uri}
          style={styles.tile}
          accessibilityLabel={`${accessibilityPrefix} photo ${i + 1} of ${filled.length}`}
        />
      ))}
    </ScrollView>
  );
}
