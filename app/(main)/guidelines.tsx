import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

const BODY = [
  'CarePair connects independent families and caregivers. Respect, clear communication, and punctuality keep the community strong.',
  'Do not share abusive, discriminatory, or exploitative content. Report concerns from the profile or conversation flows when backend support is enabled.',
  'For safety, prefer in-app messaging and scheduled meet-ups. Replace this copy with counsel-approved community guidelines before launch.',
];

export default function GuidelinesScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: {
          fontSize: 24,
          fontWeight: '800',
          color: c.text,
          marginBottom: spacing.md,
          fontFamily: f.semibold,
        },
        p: {
          fontSize: 15,
          lineHeight: 22,
          color: c.textSecondary,
          marginBottom: spacing.md,
          fontFamily: f.regular,
        },
      }),
    [c, f],
  );

  return (
    <Screen scroll>
      <Text style={styles.h1}>Community guidelines</Text>
      {BODY.map((p) => (
        <Text key={p.slice(0, 24)} style={styles.p}>
          {p}
        </Text>
      ))}
    </Screen>
  );
}
