import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  /** Real uploaded URLs only — empty strings ignored. */
  urls: string[];
  /** Total slots to render (filled first, then dashed placeholders). */
  maxSlots: number;
  slotSize: number;
  borderRadius: number;
  gap?: number;
};

/**
 * Production-style photo strip: real thumbnails where the user added photos, dashed slots for the rest.
 */
export function PhotoSlotsRow({ urls, maxSlots, slotSize, borderRadius, gap = spacing.sm }: Props) {
  const { colors: c } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', flexWrap: 'wrap', gap },
        slot: {
          width: slotSize,
          height: slotSize,
          borderRadius,
          overflow: 'hidden',
          backgroundColor: c.surface,
        },
        phSlot: {
          width: slotSize,
          height: slotSize,
          borderRadius,
        },
      }),
    [c.surface, gap, borderRadius, slotSize],
  );

  const filled = urls.map((u) => u.trim()).filter(Boolean);
  const totalSlots = Math.max(maxSlots, filled.length);

  return (
    <View style={styles.row}>
      {Array.from({ length: totalSlots }, (_, i) => {
        const u = filled[i];
        if (u) {
          return (
            <View key={`img-${i}`} style={styles.slot} accessibilityLabel={`Photo ${i + 1}`} accessibilityRole="image">
              <Image source={{ uri: u }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            </View>
          );
        }
        return (
          <ImagePlaceholder
            key={`ph-${i}`}
            style={styles.phSlot}
            accessibilityLabel={`Empty photo slot ${i + 1}`}
          />
        );
      })}
    </View>
  );
}
