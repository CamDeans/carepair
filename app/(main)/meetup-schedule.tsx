import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ImagePlaceholder } from '@/src/components/ui/ImagePlaceholder';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { formatZodError, meetupProposalSchema } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function MeetupScheduleScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { peerName } = useLocalSearchParams<{ peerName?: string }>();
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle },
      sub: { ...t.sub, marginBottom: spacing.md },
      mapSlot: {
        width: '100%',
        height: 160,
        borderRadius: radius.lg,
        marginBottom: layout.sectionGap - spacing.sm,
      },
    });
  }, [c, f]);

  const submit = () => {
    const v = meetupProposalSchema.safeParse({ when, where });
    if (!v.success) {
      Alert.alert('Check details', formatZodError(v.error));
      return;
    }
    Alert.alert(
      'Meet-up proposed',
      `${v.data.when} @ ${v.data.where} with ${peerName ?? 'your match'}.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Schedule meet-up</Text>
      <Text style={styles.sub}>With {peerName ?? 'your match'}</Text>
      <ImagePlaceholder style={styles.mapSlot} accessibilityLabel="Meet-up location preview" />
      <TextField label="When" value={when} onChangeText={setWhen} placeholder="Tue Mar 30, 3:00pm" />
      <TextField label="Where" value={where} onChangeText={setWhere} placeholder="Coffee shop / park / video call" />
      <Button title="Send proposal" onPress={submit} disabled={!when.trim() || !where.trim()} />
    </Screen>
  );
}
