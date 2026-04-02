import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ProfilePhoto } from '@/src/components/ui/ProfilePhoto';
import type { DiscoverCardDto } from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

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

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      card: {
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: c.border,
        minHeight: 360,
        alignSelf: 'stretch',
        shadowColor: c.shadowInk,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      },
      photo: { width: '100%', height: 208, borderRadius: radius.lg, marginBottom: layout.sectionGap - spacing.sm },
      name: { ...t.sectionTitle, fontSize: 22, lineHeight: 28 },
      city: { ...t.sub, marginTop: spacing.xs },
      distance: { ...t.caption, marginTop: 2, fontSize: 13 },
      snippet: { ...t.sub, color: c.text, marginTop: spacing.sm },
      meta: {
        ...t.caption,
        marginTop: spacing.sm,
        fontWeight: '600',
        color: c.primaryDark,
        fontFamily: f.semibold,
      },
      empty: { padding: spacing.lg, alignItems: 'center' },
      emptyText: { ...t.bodySecondary, textAlign: 'center' },
    });
  }, [c, f]);

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
        <ProfilePhoto
          uri={card.photoUri}
          style={styles.photo}
          accessibilityLabel={`${card.displayName ?? 'Member'} profile photo`}
        />
        <Text style={styles.name}>{card.displayName ?? 'Member'}</Text>
        <Text style={styles.city}>{card.city ?? ''}</Text>
        {card.distanceKm != null ? (
          <Text style={styles.distance}>{card.distanceKm} km away</Text>
        ) : null}
        <Text style={styles.snippet} numberOfLines={3}>
          {card.snippet}
        </Text>
        {card.payRangeLabel ? <Text style={styles.meta}>{card.payRangeLabel}</Text> : null}
      </Animated.View>
    </GestureDetector>
  );
}
