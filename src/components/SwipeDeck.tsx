import { useMemo } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { DiscoverCardDto } from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

const SW = Dimensions.get('window').width;
const THRESHOLD = SW * 0.25;

type Props = {
  card: DiscoverCardDto | null;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

export function SwipeDeck({ card, onSwipeLeft, onSwipeRight }: Props) {
  const { colors: c, fonts: f } = useCarePairUi();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: c.border,
          minHeight: 360,
          width: SW - spacing.md * 4,
          alignSelf: 'center',
          shadowColor: c.shadowInk,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        photo: { width: '100%', height: 200, borderRadius: radius.md, marginBottom: spacing.md },
        photoPh: { backgroundColor: c.primaryMuted, alignItems: 'center', justifyContent: 'center' },
        ph: {
          fontSize: 64,
          fontWeight: '600',
          color: c.primaryDark,
          fontFamily: f.semibold,
        },
        name: {
          fontSize: 22,
          fontWeight: '600',
          color: c.text,
          fontFamily: f.semibold,
        },
        city: { fontSize: 15, color: c.textSecondary, marginTop: 4, fontFamily: f.regular },
        snippet: {
          fontSize: 15,
          color: c.text,
          marginTop: spacing.sm,
          lineHeight: 22,
          fontFamily: f.regular,
        },
        meta: {
          marginTop: spacing.sm,
          fontWeight: '600',
          color: c.primaryDark,
          fontFamily: f.semibold,
        },
        empty: { padding: spacing.lg, alignItems: 'center' },
        emptyText: {
          textAlign: 'center',
          color: c.textSecondary,
          fontSize: 16,
          lineHeight: 24,
          fontFamily: f.regular,
        },
      }),
    [c, f],
  );

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX > THRESHOLD) {
        runOnJS(onSwipeRight)();
        tx.value = withSpring(SW * 1.5);
      } else if (e.translationX < -THRESHOLD) {
        runOnJS(onSwipeLeft)();
        tx.value = withSpring(-SW * 1.5);
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${tx.value / 25}deg` }],
  }));

  if (!card) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No more profiles nearby. Widen search radius or check back later.</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, style]}>
        {card.photoUri ? (
          <Image source={{ uri: card.photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPh]}>
            <Text style={styles.ph}>{(card.displayName ?? '?').slice(0, 1)}</Text>
          </View>
        )}
        <Text style={styles.name}>{card.displayName ?? 'Member'}</Text>
        <Text style={styles.city}>{card.city ?? ''}</Text>
        <Text style={styles.snippet} numberOfLines={3}>
          {card.snippet}
        </Text>
        {card.payRangeLabel ? <Text style={styles.meta}>{card.payRangeLabel}</Text> : null}
      </Animated.View>
    </GestureDetector>
  );
}
