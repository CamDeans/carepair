import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, spacing } from '@/src/theme/tokens';

const FAQ = [
  { q: 'How does CareSpace work?', a: 'After you match, start a trial to share a calendar, confirm shifts, and keep care notes in one place.' },
  { q: 'Who pays?', a: 'Families subscribe after a 7-day trial. Caregivers use CarePair for free.' },
  { q: 'Is this a background-checked marketplace?', a: 'MVP focuses on the core loop. Background checks are planned for Phase 2.' },
];

export default function HelpScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, fontSize: 24, lineHeight: 28, marginBottom: layout.sectionGap - spacing.sm },
      block: { marginBottom: spacing.lg },
      q: { ...t.body, fontWeight: '600', fontFamily: f.semibold },
      a: { ...t.sub, marginTop: spacing.xs },
      link: {
        ...t.body,
        color: c.primary,
        fontWeight: '600',
        marginTop: spacing.md,
        fontFamily: f.semibold,
      },
    });
  }, [c, f]);

  return (
    <Screen scroll>
      <Text style={styles.h1}>Help & support</Text>
      {FAQ.map((item) => (
        <Text key={item.q} style={styles.block}>
          <Text style={styles.q}>{item.q}{'\n'}</Text>
          <Text style={styles.a}>{item.a}</Text>
        </Text>
      ))}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Email support"
        onPress={() => Linking.openURL('mailto:support@carepair.example')}>
        <Text style={styles.link} importantForAccessibility="no">
          Email support (placeholder)
        </Text>
      </Pressable>
    </Screen>
  );
}
