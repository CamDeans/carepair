import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useInboxUnreadStore } from '@/src/store/inboxUnreadStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

export default function MessagesScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [rows, setRows] = useState<api.ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: {
          fontSize: 28,
          fontWeight: '800',
          color: c.text,
          marginBottom: spacing.md,
          fontFamily: f.semibold,
        },
        empty: { fontSize: 15, color: c.textSecondary, lineHeight: 22, fontFamily: f.regular },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          gap: spacing.md,
        },
        avatar: {
          width: 48,
          height: 48,
          borderRadius: radius.md,
          backgroundColor: c.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarText: { fontSize: 18, fontWeight: '700', color: c.primaryDark, fontFamily: f.semibold },
        body: { flex: 1 },
        name: { fontSize: 16, fontWeight: '700', color: c.text, fontFamily: f.semibold },
        preview: { fontSize: 14, color: c.textSecondary, marginTop: 2, fontFamily: f.regular },
        dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
      }),
    [c, f],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const { conversations } = await api.conversationsList();
          if (!cancelled) {
            setRows(conversations);
            useInboxUnreadStore.getState().syncFromList(conversations);
          }
        } catch {
          if (!cancelled) setRows([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <Screen scroll>
      <Text style={styles.h1}>Inbox</Text>
      {loading ? <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} /> : null}
      {rows.map((t) => (
        <Pressable
          key={t.id}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={`${t.unread ? 'Unread. ' : ''}Open conversation with ${t.peerName}`}
          onPress={() => router.push(`/conversation/${t.id}`)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{t.peerName.slice(0, 1)}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{t.peerName}</Text>
            <Text style={styles.preview} numberOfLines={1}>
              {t.lastMessage}
            </Text>
          </View>
          {t.unread ? <View style={styles.dot} importantForAccessibility="no" /> : null}
        </Pressable>
      ))}
      {!loading && rows.length === 0 ? (
        <Text style={styles.empty}>No conversations yet. Match with someone, then open Messages from their profile.</Text>
      ) : null}
    </Screen>
  );
}
