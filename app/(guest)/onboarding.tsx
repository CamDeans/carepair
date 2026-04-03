import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { BrandLogo } from '@/src/components/BrandLogo';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { ImagePlaceholder } from '@/src/components/ui/ImagePlaceholder';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

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

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      padded: { paddingHorizontal: layout.screenPaddingX },
      brandRow: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.sm },
      slide: {
        width,
        paddingHorizontal: layout.screenPaddingX + spacing.sm,
        paddingVertical: spacing.lg,
        justifyContent: 'center',
        minHeight: 420,
      },
      visualSlot: {
        alignSelf: 'center',
        width: '100%',
        maxWidth: 320,
        height: 180,
        marginBottom: layout.sectionGap,
        borderRadius: radius.lg,
      },
      title: {
        ...t.sectionTitle,
        fontSize: 26,
        lineHeight: 30,
        marginBottom: spacing.md,
        textAlign: 'center',
      },
      body: { ...t.bodySecondary, textAlign: 'center', lineHeight: 24 },
      dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing.lg },
      dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
      dotOn: { backgroundColor: c.primary, width: 22 },
      actions: { gap: spacing.md, paddingBottom: spacing.md },
    });
  }, [c, f, width]);

  const goAuth = () => {
    setSeen(true);
    router.replace('/signup');
  };

  return (
    <Screen contentPaddingH={false}>
      <View style={[styles.padded, styles.brandRow]}>
        <BrandLogo />
      </View>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
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
          <View style={styles.slide}>
            <ImagePlaceholder
              style={styles.visualSlot}
              accessibilityLabel={`Visual for ${item.title}`}
            />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={[styles.padded, styles.actions]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
        <Button title="Get started" onPress={goAuth} />
        <Button title="I already have an account" variant="ghost" onPress={() => { setSeen(true); router.replace('/login'); }} />
      </View>
    </Screen>
  );
}
