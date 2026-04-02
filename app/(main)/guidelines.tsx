import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, spacing } from '@/src/theme/tokens';

const BODY = [
  'CarePair connects independent families and caregivers. Respect, clear communication, and punctuality keep the community strong.',
  'Do not share abusive, discriminatory, or exploitative content. Report concerns from the profile or conversation flows when backend support is enabled.',
  'For safety, prefer in-app messaging and scheduled meet-ups. Replace this copy with counsel-approved community guidelines before launch.',
];

export default function GuidelinesScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, fontSize: 24, lineHeight: 28, marginBottom: layout.sectionGap - spacing.sm },
      p: { ...t.sub, marginBottom: spacing.md },
    });
  }, [c, f]);

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
