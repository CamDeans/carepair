import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BrandLogo } from '@/src/components/BrandLogo';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

const SLIDES = [
  {
    title: 'Find care that fits',
    body: 'Browse caregivers matched to your schedule, neighbourhood, and needs — starting in Calgary.',
  },
  {
    title: 'Keep everything in one place',
    body: 'Message, schedule meet-ups, and run your working relationship without jumping to texts and email.',
  },
  {
    title: 'CareSpace for real relationships',
    body: 'Shared calendar, shift confirmations, and care notes after you agree to work together. Families: $19.99/mo after a 7-day trial.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const setSeen = useAuthStore((s) => s.setHasSeenOnboarding);
  const { colors: c, fonts: f } = useCarePairUi();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        brandRow: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.sm },
        slide: { paddingTop: spacing.xl, paddingHorizontal: spacing.md },
        title: {
          fontSize: 26,
          fontWeight: '800',
          color: c.text,
          marginBottom: spacing.md,
          fontFamily: f.semibold,
        },
        body: { fontSize: 16, lineHeight: 24, color: c.textSecondary, fontFamily: f.regular },
        dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing.lg },
        dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
        dotOn: { backgroundColor: c.primary, width: 22 },
      }),
    [c, f],
  );

  const goAuth = () => {
    setSeen(true);
    router.replace('/signup');
  };

  return (
    <Screen>
      <View style={styles.brandRow}>
        <BrandLogo />
      </View>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>
      <Button title="Get started" onPress={goAuth} />
      <Button title="I already have an account" variant="ghost" onPress={() => { setSeen(true); router.replace('/login'); }} />
    </Screen>
  );
}
