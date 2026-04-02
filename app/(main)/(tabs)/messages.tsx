import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfilePhoto } from '@/src/components/ui/ProfilePhoto';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useInboxUnreadStore } from '@/src/store/inboxUnreadStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function MessagesScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [rows, setRows] = useState<api.ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: layout.sectionGap - spacing.sm },
      empty: { ...t.bodySecondary },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: layout.listRowMinHeight,
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
        gap: spacing.md,
      },
      avatar: { width: 48, height: 48, borderRadius: radius.md },
      body: { flex: 1, minWidth: 0 },
      name: { ...t.body, fontWeight: '600', fontFamily: f.semibold },
      preview: { ...t.caption, marginTop: 2 },
      dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
    });
  }, [c, f]);

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
          <ProfilePhoto
            uri={t.peerPhotoUri}
            style={styles.avatar}
            accessibilityLabel={`${t.peerName} profile photo`}
          />
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
