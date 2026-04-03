import { useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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

function Chip({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <View style={[chipStyles.pill, { backgroundColor: colors.bg }]} accessibilityLabel={label}>
      <Text style={[chipStyles.pillText, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.md,
    maxWidth: '100%',
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
});

export function SwipeDeck({ card, onSwipeLeft, onSwipeRight, onHeart, onOpenProfile }: Props) {
  const { colors: c, fonts: f } = useCarePairUi();
  const { width: winW, height: winH } = useWindowDimensions();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const heroH = useMemo(() => Math.min(280, Math.max(220, Math.round(winH * 0.28))), [winH]);

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
        borderRadius: radius.lg + 4,
        padding: 0,
        borderWidth: 1,
        borderColor: c.border,
        alignSelf: 'stretch',
        overflow: 'hidden',
        shadowColor: c.shadowInk,
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      },
      hero: {
        height: heroH,
        width: '100%',
        borderTopLeftRadius: radius.lg + 4,
        borderTopRightRadius: radius.lg + 4,
        overflow: 'hidden',
      },
      heroPhoto: { width: '100%', height: '100%' },
      scrim: {
        ...StyleSheet.absoluteFillObject,
        top: undefined,
        height: 112,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
      },
      heroTextBlock: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
      },
      heroName: {
        color: '#FFFFFF',
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '700',
        fontFamily: f.semibold,
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
      heroMeta: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 14,
        marginTop: 4,
        fontFamily: f.regular,
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
      body: {
        paddingHorizontal: layout.screenPaddingX,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
      },
      snippet: { ...t.sub, color: c.text, marginTop: spacing.xs, lineHeight: 22 },
      detail: { ...t.body, color: c.textSecondary, marginTop: spacing.sm, lineHeight: 22 },
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
        marginTop: spacing.md,
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
      swipeHint: {
        position: 'absolute',
        top: '38%',
        zIndex: 2,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.md,
        borderWidth: 2,
      },
    });
  }, [c, f, heroH]);

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

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: tx.value > 18 ? Math.min(1, tx.value / THRESHOLD) : 0,
  }));
  const passOverlayStyle = useAnimatedStyle(() => ({
    opacity: tx.value < -18 ? Math.min(1, -tx.value / THRESHOLD) : 0,
  }));

  if (!card) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No more profiles nearby. Widen search radius or check back later.</Text>
      </View>
    );
  }

  const isFamily = card.role === 'family';
  const chipBg = c.primaryMuted;
  const chipFg = c.primaryDark;

  return (
    <View style={[styles.wrap, { maxWidth: winW - layout.screenPaddingX * 2 }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, style]}>
          <View style={styles.hero}>
            <ProfilePhoto uri={card.photoUri} style={styles.heroPhoto} accessibilityLabel={`${card.displayName ?? 'Member'} photo`} />
            <View style={styles.scrim} />
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroName} numberOfLines={2}>
                {card.displayName ?? 'Member'}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={2}>
                {[card.city, card.distanceKm != null ? `${card.distanceKm} km away` : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.swipeHint,
              { right: spacing.md, borderColor: c.primary, backgroundColor: 'rgba(45,106,80,0.12)' },
              likeOverlayStyle,
            ]}>
            <Text style={{ color: c.primaryDark, fontWeight: '800', fontFamily: f.semibold }}>LIKE</Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.swipeHint,
              { left: spacing.md, borderColor: c.textSubtle, backgroundColor: 'rgba(0,0,0,0.06)' },
              passOverlayStyle,
            ]}>
            <Text style={{ color: c.textSecondary, fontWeight: '800', fontFamily: f.semibold }}>PASS</Text>
          </Animated.View>

          <View style={styles.body}>
            {!isFamily ? (
              <View style={chipStyles.row}>
                {card.firstAidCpr ? <Chip label="First aid / CPR" colors={{ bg: chipBg, text: chipFg }} /> : null}
                {card.vulnerableSectorCheck ? (
                  <Chip label="Vulnerable sector" colors={{ bg: chipBg, text: chipFg }} />
                ) : null}
                {card.yearsExperienceLabel ? (
                  <Chip label={card.yearsExperienceLabel} colors={{ bg: chipBg, text: chipFg }} />
                ) : null}
              </View>
            ) : null}

            {isFamily ? (
              <View style={chipStyles.row}>
                {card.supportingDocumentsOnFile ? (
                  <Chip label="Supporting docs on file" colors={{ bg: chipBg, text: chipFg }} />
                ) : null}
                {card.childrenSummary ? <Chip label={card.childrenSummary} colors={{ bg: chipBg, text: chipFg }} /> : null}
                {card.petsPreview ? <Chip label={card.petsPreview} colors={{ bg: chipBg, text: chipFg }} /> : null}
              </View>
            ) : null}

            <Text style={styles.snippet} numberOfLines={isFamily ? 3 : 2}>
              {card.snippet}
            </Text>

            {card.detailPreview ? (
              <Text style={styles.detail} numberOfLines={4}>
                {card.detailPreview}
              </Text>
            ) : null}

            {!isFamily && card.certificationsPreview ? (
              <Text style={styles.detail} numberOfLines={2}>
                {card.certificationsPreview}
              </Text>
            ) : null}

            {!isFamily && card.availabilityPreview ? (
              <Text style={styles.detail} numberOfLines={2}>
                Availability: {card.availabilityPreview}
              </Text>
            ) : null}

            {isFamily && card.carePreview ? (
              <Text style={styles.detail} numberOfLines={2}>
                Care preferences: {card.carePreview}
              </Text>
            ) : null}

            {card.languagesPreview ? (
              <Text style={styles.detail} numberOfLines={1}>
                Languages: {card.languagesPreview}
              </Text>
            ) : null}

            {!isFamily && card.educationPreview ? (
              <Text style={styles.detail} numberOfLines={1}>
                Education: {card.educationPreview}
              </Text>
            ) : null}

            {card.payRangeLabel ? <Text style={styles.meta}>{card.payRangeLabel}</Text> : null}

            {onOpenProfile ? (
              <Text style={styles.tapHint}>Tap card for full profile · swipe right to like, left to pass</Text>
            ) : null}
          </View>
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
