import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ImagePlaceholder } from '@/src/components/ui/ImagePlaceholder';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { connectionIntroSchema, formatZodError } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function ConnectionRequestScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { peerName, peerId } = useLocalSearchParams<{ peerName?: string; peerId?: string }>();
  const [intro, setIntro] = useState('');

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle },
      sub: { ...t.sub, marginVertical: spacing.md },
      sub2: { ...t.caption, marginBottom: spacing.md },
      peerVisual: {
        width: 96,
        height: 96,
        borderRadius: radius.lg,
        marginBottom: layout.sectionGap - spacing.sm,
        alignSelf: 'center',
      },
    });
  }, [c, f]);

  const send = async () => {
    const v = connectionIntroSchema.safeParse(intro);
    if (!v.success) {
      Alert.alert('Check your intro', formatZodError(v.error));
      return;
    }
    if (!peerId?.trim()) {
      Alert.alert('Missing peer', 'Open this screen from a profile.');
      return;
    }
    try {
      const { conversationId } = await api.conversationOpen(peerId.trim());
      await api.messageSend(conversationId, v.data);
      router.replace(`/conversation/${conversationId}`);
    } catch (e) {
      Alert.alert('Connection', e instanceof Error ? e.message : 'You need a mutual match to start chat.');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Connection request</Text>
      <ImagePlaceholder
        style={styles.peerVisual}
        accessibilityLabel={`${peerName ?? 'Match'} profile photo placeholder`}
      />
      <Text style={styles.sub}>
        To: {peerName ?? 'Match'} {peerId ? `(#${peerId})` : ''}
      </Text>
      <Text style={styles.sub2}>We’ll open chat and send your intro as the first message (requires a match).</Text>
      <TextField
        label="Short intro"
        value={intro}
        onChangeText={setIntro}
        multiline
        placeholder="Hi! We’re looking for…"
      />
      <Button title="Send & open chat" onPress={() => void send()} disabled={!intro.trim()} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
