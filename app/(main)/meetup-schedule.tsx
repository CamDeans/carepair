import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { formatZodError, meetupProposalSchema } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

export default function MeetupScheduleScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { peerName } = useLocalSearchParams<{ peerName?: string }>();
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: { fontSize: 22, fontWeight: '800', color: c.text, fontFamily: f.semibold },
        sub: { fontSize: 15, color: c.textSecondary, marginBottom: spacing.md, fontFamily: f.regular },
      }),
    [c, f],
  );

  const submit = () => {
    const v = meetupProposalSchema.safeParse({ when, where });
    if (!v.success) {
      Alert.alert('Check details', formatZodError(v.error));
      return;
    }
    Alert.alert('Meet-up proposed', `${v.data.when} @ ${v.data.where} with ${peerName ?? 'match'} (demo).`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Schedule meet-up</Text>
      <Text style={styles.sub}>With {peerName ?? 'your match'}</Text>
      <TextField label="When" value={when} onChangeText={setWhen} placeholder="Tue Mar 30, 3:00pm" />
      <TextField label="Where" value={where} onChangeText={setWhere} placeholder="Coffee shop / park / video call" />
      <Button title="Send proposal" onPress={submit} disabled={!when.trim() || !where.trim()} />
    </Screen>
  );
}
