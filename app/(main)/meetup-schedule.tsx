import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ImagePlaceholder } from '@/src/components/ui/ImagePlaceholder';
import { Screen } from '@/src/components/ui/Screen';
import { InlineError } from '@/src/components/ui/InlineError';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { meetupProposalSchema } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function MeetupScheduleScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { peerName, peerId } = useLocalSearchParams<{ peerName?: string; peerId?: string }>();
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [sending, setSending] = useState(false);
  const [whenError, setWhenError] = useState('');
  const [whereError, setWhereError] = useState('');
  const [submitError, setSubmitError] = useState('');

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
    setWhenError('');
    setWhereError('');
    setSubmitError('');
    const v = meetupProposalSchema.safeParse({ when, where });
    if (!v.success) {
      for (const iss of v.error.issues) {
        const p = iss.path[0];
        if (p === 'when') setWhenError(iss.message);
        if (p === 'where') setWhereError(iss.message);
      }
      return;
    }
    const to = peerId?.trim();
    if (!to) {
      setSubmitError('Open this screen from a profile so we know who to notify.');
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
      setSubmitError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Schedule meet-up</Text>
      <Text style={styles.sub}>With {peerName ?? 'your match'}</Text>
      <ImagePlaceholder style={styles.mapSlot} accessibilityLabel="Meet-up location preview" />
      <TextField
        label="When"
        value={when}
        onChangeText={setWhen}
        placeholder="Tue Mar 30, 3:00pm"
        error={whenError || undefined}
      />
      <TextField
        label="Where"
        value={where}
        onChangeText={setWhere}
        placeholder="Coffee shop / park / video call"
        error={whereError || undefined}
      />
      {submitError ? <InlineError message={submitError} onRetry={() => void submit()} /> : null}
      <View style={styles.actions}>
        <Button title="Send proposal" onPress={() => void submit()} loading={sending} disabled={!when.trim() || !where.trim()} />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} disabled={sending} />
      </View>
    </Screen>
  );
}
