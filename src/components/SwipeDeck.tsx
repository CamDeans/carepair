import { useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Button } from '@/src/components/ui/Button';
import { ProfilePhoto } from '@/src/components/ui/ProfilePhoto';
import type { DiscoverCardDto } from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

const SW = Dimensions.get('window').width;
/** Primary swipe distance to commit (like / pass). */
const THRESHOLD = SW * 0.22;
/** Fling velocity (pt/s) — quick flick counts even slightly under distance. */
const VELOCITY_FLING = 520;
const FLING_MIN_DX = 36;
const TAP_MAX_MOVE = 14;

type Props = {
  card: DiscoverCardDto | null;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onHeart: () => void;
  onOpenProfile?: () => void;
};

export function SwipeDeck({ card, onSwipeLeft, onSwipeRight, onHeart, onOpenProfile }: Props) {
  const { colors: c, fonts: f } = useCarePairUi();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    tx.value = 0;
    ty.value = 0;
  }, [card?.id, tx, ty]);

  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  const onOpenProfileRef = useRef(onOpenProfile);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;
  onOpenProfileRef.current = onOpenProfile;

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      wrap: { alignSelf: 'stretch' },
      card: {
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        paddingBottom: spacing.md,
        borderWidth: 1,
        borderColor: c.border,
        minHeight: 320,
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
      tapHint: {
        ...t.caption,
        fontSize: 12,
        marginTop: spacing.sm,
        textAlign: 'center',
        color: c.textSubtle,
      },
      actions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
        paddingHorizontal: spacing.xs,
      },
      actionBtn: { flex: 1, minWidth: 0 },
      empty: { padding: spacing.lg, alignItems: 'center' },
      emptyText: { ...t.bodySecondary, textAlign: 'center' },
    });
  }, [c, f]);

  const fireSwipeLeft = useMemo(
    () => () => {
      onSwipeLeftRef.current();
    },
    [],
  );
  const fireSwipeRight = useMemo(
    () => () => {
      onSwipeRightRef.current();
    },
    [],
  );
  const fireOpenProfile = useMemo(
    () => () => {
      onOpenProfileRef.current?.();
    },
    [],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        /**
         * Compete fairly with parent vertical scroll: don’t steal the gesture until there’s clear horizontal intent,
         * and bail if the user is clearly scrolling vertically first.
         */
        .activeOffsetX([-14, 14])
        .failOffsetY([-22, 22])
        .onUpdate((e) => {
          tx.value = e.translationX;
          ty.value = e.translationY * 0.28;
        })
        .onEnd((e) => {
          const dx = e.translationX;
          const vx = e.velocityX;
          const likeByDistance = dx > THRESHOLD;
          const passByDistance = dx < -THRESHOLD;
          const likeByFling = vx > VELOCITY_FLING && dx > FLING_MIN_DX;
          const passByFling = vx < -VELOCITY_FLING && dx < -FLING_MIN_DX;

          if (likeByDistance || likeByFling) {
            runOnJS(fireSwipeRight)();
            tx.value = withSpring(SW * 1.5);
          } else if (passByDistance || passByFling) {
            runOnJS(fireSwipeLeft)();
            tx.value = withSpring(-SW * 1.5);
          } else {
            const tapLike =
              Math.abs(dx) <= TAP_MAX_MOVE && Math.abs(e.translationY) <= TAP_MAX_MOVE && Math.abs(vx) < 220;
            if (tapLike) {
              runOnJS(fireOpenProfile)();
            }
            tx.value = withSpring(0);
            ty.value = withSpring(0);
          }
        }),
    [fireOpenProfile, fireSwipeLeft, fireSwipeRight, tx, ty],
  );

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
    <View style={styles.wrap}>
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
          {onOpenProfile ? (
            <Text style={styles.tapHint}>Tap the card to open full profile · swipe or flick left/right</Text>
          ) : null}
        </Animated.View>
      </GestureDetector>
      <View style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button title="Pass" variant="secondary" size="sm" onPress={onSwipeLeft} />
        </View>
        <View style={styles.actionBtn}>
          <Button title="Heart" variant="secondary" size="sm" onPress={onHeart} />
        </View>
        <View style={styles.actionBtn}>
          <Button title="Like" size="sm" onPress={onSwipeRight} />
        </View>
      </View>
    </View>
  );
}
