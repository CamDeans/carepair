import { useLocalSearchParams } from 'expo-router';
import { format, isValid, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ProfilePhoto } from '@/src/components/ui/ProfilePhoto';
import { TextField } from '@/src/components/ui/TextField';
import type { ChatMessageDto, ConversationPeerDto } from '@/src/lib/serverApi';
import * as api from '@/src/lib/serverApi';
import { pickProfilePhotoUri } from '@/src/lib/profilePhoto';
import { hapticImpactLight } from '@/src/lib/haptics';
import { getChatSocket } from '@/src/lib/socket';
import { useAuthStore } from '@/src/store/authStore';
import { useInboxUnreadStore } from '@/src/store/inboxUnreadStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

const AVATAR = 36;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c, fonts: f } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const myId = user?.id;
  const myPhotoUri = useMemo(() => {
    if (!user) return null;
    if (user.role === 'family') return pickProfilePhotoUri(user.familyProfile ?? undefined);
    if (user.role === 'caregiver') return pickProfilePhotoUri(user.caregiverProfile ?? undefined);
    return null;
  }, [user]);

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [peer, setPeer] = useState<ConversationPeerDto | null>(null);
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
      row: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: spacing.sm,
        maxWidth: '100%',
      },
      rowMe: { justifyContent: 'flex-end' },
      rowThem: { justifyContent: 'flex-start' },
      rowFill: { flex: 1, minWidth: 0 },
      bubble: {
        maxWidth: '78%',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
      },
      them: {
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        borderTopLeftRadius: radius.sm,
        borderTopRightRadius: radius.lg,
        borderBottomLeftRadius: radius.lg,
        borderBottomRightRadius: radius.lg,
      },
      me: {
        backgroundColor: c.primary,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.sm,
        borderBottomLeftRadius: radius.lg,
        borderBottomRightRadius: radius.lg,
      },
      bubbleText: { ...t.body },
      meText: { color: c.onPrimary, fontFamily: f.regular },
      time: { ...t.caption, fontSize: 11, marginTop: 4, color: c.textSecondary },
      timeMe: { ...t.caption, fontSize: 11, marginTop: 4, color: c.onPrimary, opacity: 0.85 },
      composer: {
        paddingHorizontal: layout.screenPaddingX,
        paddingVertical: layout.screenPaddingY,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.border,
        backgroundColor: c.surface,
      },
    });
  }, [c, f]);

  const appendUnique = useCallback((m: ChatMessageDto) => {
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
      setPeer(null);
      try {
        const { messages: list, peer: peerRow } = await api.messagesList(id);
        setPeer(peerRow ?? null);
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
          message: ChatMessageDto;
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
        setPeer(null);
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
      void hapticImpactLight();
      void useInboxUnreadStore.getState().refreshFromServer();
    } catch {
      setDraft(body);
    }
  };

  /** Outgoing: always current user's profile photo from the session (not server echo). Incoming: sender URI, else peer snapshot from thread. */
  const photoFor = (m: ChatMessageDto, fromMe: boolean) => {
    if (fromMe) return myPhotoUri;
    return m.senderPhotoUri ?? peer?.photoUri ?? null;
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
        extraData={{ myId, myPhotoUri, peer }}
        renderItem={({ item }) => {
          const fromMe = myId != null && String(item.senderId) === String(myId);
          const uri = photoFor(item, fromMe);
          const sent = parseISO(item.createdAt);
          const timeLabel = isValid(sent) ? format(sent, 'h:mm a') : '';
          return (
            <View style={[styles.row, fromMe ? styles.rowMe : styles.rowThem]}>
              {fromMe ? (
                <>
                  <View style={styles.rowFill} />
                  <View style={[styles.bubble, styles.me]}>
                    <Text style={[styles.bubbleText, styles.meText]}>{item.body}</Text>
                    {timeLabel ? (
                      <Text style={styles.timeMe} accessibilityLabel={`Sent ${timeLabel}`}>
                        {timeLabel}
                      </Text>
                    ) : null}
                  </View>
                  <ProfilePhoto
                    uri={uri}
                    style={{
                      width: AVATAR,
                      height: AVATAR,
                      borderRadius: AVATAR / 2,
                      marginLeft: spacing.sm,
                    }}
                    accessibilityLabel="Your profile"
                  />
                </>
              ) : (
                <>
                  <ProfilePhoto
                    uri={uri}
                    style={{
                      width: AVATAR,
                      height: AVATAR,
                      borderRadius: AVATAR / 2,
                      marginRight: spacing.sm,
                    }}
                    accessibilityLabel="Sender profile"
                  />
                  <View style={[styles.bubble, styles.them]}>
                    <Text style={styles.bubbleText}>{item.body}</Text>
                    {timeLabel ? (
                      <Text style={styles.time} accessibilityLabel={`Sent ${timeLabel}`}>
                        {timeLabel}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.rowFill} />
                </>
              )}
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
