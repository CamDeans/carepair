import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function NotificationsSettingsScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [messages, setMessages] = useState(true);
  const [shifts, setShifts] = useState(true);
  const [matches, setMatches] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = user?.notificationPrefs;
    if (!p) return;
    setMessages(p.messages);
    setShifts(p.shifts);
    setMatches(p.matches);
    setMarketing(p.marketing);
  }, [user?.notificationPrefs]);

  const patch = useCallback(
    async (partial: Partial<api.NotificationPrefs>) => {
      setSaving(true);
      try {
        await api.profileNotificationPrefsPatch(partial);
        await refreshMe();
      } catch (e) {
        Alert.alert('Notifications', e instanceof Error ? e.message : 'Could not save');
      } finally {
        setSaving(false);
      }
    },
    [refreshMe],
  );

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, fontSize: 24, lineHeight: 28 },
      sub: { ...t.caption, marginVertical: spacing.md },
      card: {
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        overflow: 'hidden',
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: layout.listRowMinHeight,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      },
      title: { ...t.body, flex: 1, paddingRight: spacing.md },
    });
  }, [c, f]);

  return (
    <Screen scroll>
      <Text style={styles.h1}>Notifications</Text>
      <Text style={styles.sub}>
        Push preferences are saved to your account. Messages, matches, and shift updates each have their own toggle.
      </Text>
      {saving ? <ActivityIndicator color={c.primary} style={{ marginBottom: spacing.sm }} /> : null}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>Messages</Text>
          <Switch
            value={messages}
            onValueChange={(v) => {
              setMessages(v);
              void patch({ messages: v });
            }}
            trackColor={{ true: c.primaryMuted }}
            thumbColor={c.primary}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.title}>Shift updates</Text>
          <Switch
            value={shifts}
            onValueChange={(v) => {
              setShifts(v);
              void patch({ shifts: v });
            }}
            trackColor={{ true: c.primaryMuted }}
            thumbColor={c.primary}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.title}>New matches</Text>
          <Switch
            value={matches}
            onValueChange={(v) => {
              setMatches(v);
              void patch({ matches: v });
            }}
            trackColor={{ true: c.primaryMuted }}
            thumbColor={c.primary}
          />
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.title}>Product updates</Text>
          <Switch
            value={marketing}
            onValueChange={(v) => {
              setMarketing(v);
              void patch({ marketing: v });
            }}
            trackColor={{ true: c.primaryMuted }}
            thumbColor={c.primary}
          />
        </View>
      </View>
    </Screen>
  );
}
