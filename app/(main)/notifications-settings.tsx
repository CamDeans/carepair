import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

export default function NotificationsSettingsScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [messages, setMessages] = useState(true);
  const [shifts, setShifts] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: { fontSize: 24, fontWeight: '800', color: c.text, fontFamily: f.semibold },
        sub: {
          fontSize: 14,
          color: c.textSecondary,
          marginVertical: spacing.md,
          lineHeight: 20,
          fontFamily: f.regular,
        },
        card: {
          backgroundColor: c.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        },
        title: { fontSize: 16, color: c.text, flex: 1, paddingRight: spacing.md, fontFamily: f.regular },
      }),
    [c, f],
  );

  return (
    <Screen scroll>
      <Text style={styles.h1}>Notifications</Text>
      <Text style={styles.sub}>UI only until push credentials and backend are connected (Phase 2).</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>Messages</Text>
          <Switch value={messages} onValueChange={setMessages} trackColor={{ true: c.primaryMuted }} thumbColor={c.primary} />
        </View>
        <View style={styles.row}>
          <Text style={styles.title}>Shift updates</Text>
          <Switch value={shifts} onValueChange={setShifts} trackColor={{ true: c.primaryMuted }} thumbColor={c.primary} />
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.title}>Product updates</Text>
          <Switch value={marketing} onValueChange={setMarketing} trackColor={{ true: c.primaryMuted }} thumbColor={c.primary} />
        </View>
      </View>
    </Screen>
  );
}
