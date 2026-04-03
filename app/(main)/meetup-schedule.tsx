import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ImagePlaceholder } from '@/src/components/ui/ImagePlaceholder';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { formatZodError, meetupProposalSchema } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function MeetupScheduleScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { peerName, peerId } = useLocalSearchParams<{ peerName?: string; peerId?: string }>();
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [sending, setSending] = useState(false);

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
      actions: { gap: spacing.md, marginTop: spacing.md },
    });
  }, [c, f]);

  const submit = async () => {
    const v = meetupProposalSchema.safeParse({ when, where });
    if (!v.success) {
      Alert.alert('Check details', formatZodError(v.error));
      return;
    }
    const to = peerId?.trim();
    if (!to) {
      Alert.alert('Missing match', 'Open this screen from a profile so we know who to notify.');
      return;
    }
    setSending(true);
    try {
      await api.meetupProposalCreate(to, v.data.when, v.data.where);
      Alert.alert(
        'Meet-up sent',
        `We saved your proposal and notified ${peerName ?? 'your match'}. They can view it under Meet-up proposals in Settings.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('Meet-up', e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Schedule meet-up</Text>
      <Text style={styles.sub}>With {peerName ?? 'your match'}</Text>
      <ImagePlaceholder style={styles.mapSlot} accessibilityLabel="Meet-up location preview" />
      <TextField label="When" value={when} onChangeText={setWhen} placeholder="Tue Mar 30, 3:00pm" />
      <TextField label="Where" value={where} onChangeText={setWhere} placeholder="Coffee shop / park / video call" />
      <View style={styles.actions}>
        <Button title="Send proposal" onPress={() => void submit()} loading={sending} disabled={!when.trim() || !where.trim()} />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} disabled={sending} />
      </View>
    </Screen>
  );
}
