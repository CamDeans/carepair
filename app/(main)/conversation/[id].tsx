import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { getChatSocket } from '@/src/lib/socket';
import { useAuthStore } from '@/src/store/authStore';
import { useInboxUnreadStore } from '@/src/store/inboxUnreadStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

type Row = { id: string; senderId: string; body: string; createdAt: string };

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c, fonts: f } = useCarePairUi();
  const myId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<Row[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);
  const seenIds = useRef(new Set<string>());

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      flex: { flex: 1, backgroundColor: c.background },
      center: { padding: spacing.lg },
      list: {
        paddingHorizontal: layout.screenPaddingX,
        paddingTop: layout.screenPaddingY,
        paddingBottom: spacing.xl,
      },
      bubble: {
        maxWidth: '85%',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
      },
      them: { alignSelf: 'flex-start', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
      me: { alignSelf: 'flex-end', backgroundColor: c.primary },
      bubbleText: { ...t.body },
      meText: { color: c.onPrimary, fontFamily: f.regular },
      composer: {
        paddingHorizontal: layout.screenPaddingX,
        paddingVertical: layout.screenPaddingY,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.border,
        backgroundColor: c.surface,
      },
    });
  }, [c, f]);

  const appendUnique = useCallback((m: Row) => {
    if (seenIds.current.has(m.id)) return;
    seenIds.current.add(m.id);
    setMessages((prev) => [...prev, m]);
  }, []);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        await api.conversationMarkRead(id);
        await useInboxUnreadStore.getState().refreshFromServer();
      } catch {
        /* ignore */
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    seenIds.current = new Set();
    let socketOff: (() => void) | undefined;

    (async () => {
      setLoading(true);
      try {
        const { messages: list } = await api.messagesList(id);
        const s = new Set<string>();
        const rows = list.map((m) => {
          s.add(m.id);
          return m;
        });
        seenIds.current = s;
        setMessages(rows);

        const socket = await getChatSocket();
        const handler = (payload: {
          conversationId: string;
          message: { id: string; senderId: string; body: string; createdAt: string };
        }) => {
          if (payload.conversationId !== id) return;
          appendUnique(payload.message);
          if (myId && payload.message.senderId !== myId) {
            void api.conversationMarkRead(id).then(() => useInboxUnreadStore.getState().refreshFromServer());
          }
        };
        socket.on('message:new', handler);
        socketOff = () => socket.off('message:new', handler);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      socketOff?.();
    };
  }, [id, appendUnique, myId]);

  const send = async () => {
    if (!id || !draft.trim() || !myId) return;
    const body = draft.trim();
    setDraft('');
    try {
      const { message } = await api.messageSend(id, body);
      appendUnique(message);
      void useInboxUnreadStore.getState().refreshFromServer();
    } catch {
      setDraft(body);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const fromMe = item.senderId === myId;
          return (
            <View style={[styles.bubble, fromMe ? styles.me : styles.them]}>
              <Text style={[styles.bubbleText, fromMe && styles.meText]}>{item.body}</Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextField label="" value={draft} onChangeText={setDraft} placeholder="Message…" />
        <Button title="Send" onPress={() => void send()} disabled={!draft.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}
