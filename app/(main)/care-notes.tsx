import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { careNoteBodySchema, formatZodError } from '@/src/lib/validation';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function CareNotesScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { peerUserId: paramPeer } = useLocalSearchParams<{ peerUserId?: string }>();
  const myRole = useAuthStore((s) => s.user?.role);
  const [notes, setNotes] = useState<api.CareNoteRow[]>([]);
  const [matches, setMatches] = useState<api.MatchPeer[]>([]);
  const [peerUserId, setPeerUserId] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle },
      sub: { ...t.caption, marginBottom: spacing.md },
      label: { ...t.label, marginBottom: spacing.xs },
      pick: {
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: spacing.sm,
      },
      pickOn: { borderColor: c.primary, backgroundColor: c.primaryMuted },
      pickText: { ...t.body },
      hint: { ...t.caption, marginBottom: layout.sectionGap - spacing.sm },
      note: {
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: spacing.sm,
      },
      meta: { ...t.caption, fontSize: 12, fontWeight: '600', color: c.primaryDark, marginBottom: spacing.xs, fontFamily: f.semibold },
      noteBody: { ...t.sub, color: c.text },
    });
  }, [c, f]);

  const otherRole: 'family' | 'caregiver' = myRole === 'family' ? 'caregiver' : 'family';

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const [notesRes, matchesRes] = await Promise.all([api.notesList(), api.matchesList()]);
          if (cancelled) return;
          setNotes(notesRes.notes);
          const peers = matchesRes.matches.filter((x) => x.role === otherRole);
          setMatches(peers);
          setPeerUserId((cur) => {
            if (paramPeer) return paramPeer;
            if (cur) return cur;
            if (peers.length === 1) return peers[0].id;
            return cur;
          });
        } catch {
          if (!cancelled) {
            setNotes([]);
            setMatches([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [paramPeer, otherRole]),
  );

  const add = async () => {
    const v = careNoteBodySchema.safeParse(body);
    if (!v.success) {
      Alert.alert('Invalid note', formatZodError(v.error));
      return;
    }
    if (!peerUserId.trim()) {
      Alert.alert('Recipient', 'Select who this note is for.');
      return;
    }
    try {
      await api.noteCreate(peerUserId.trim(), v.data);
      setBody('');
      const refreshed = await api.notesList();
      setNotes(refreshed.notes);
    } catch (e) {
      Alert.alert('Note', e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Care notes</Text>
      <Text style={styles.sub}>Visible to both family and caregiver for this match.</Text>
      {loading ? <ActivityIndicator color={c.primary} style={{ marginBottom: spacing.md }} /> : null}
      <Text style={styles.label}>Note for</Text>
      {matches.map((m) => (
        <Pressable
          key={m.id}
          style={[styles.pick, peerUserId === m.id && styles.pickOn]}
          accessibilityRole="button"
          accessibilityLabel={`Note for ${m.displayName}${m.city ? `, ${m.city}` : ''}`}
          accessibilityState={{ selected: peerUserId === m.id }}
          onPress={() => setPeerUserId(m.id)}>
          <Text style={styles.pickText} importantForAccessibility="no">
            {m.displayName} · {m.city ?? ''}
          </Text>
        </Pressable>
      ))}
      {matches.length === 0 && !loading ? (
        <Text style={styles.hint}>No matches yet — match in Discover to share notes.</Text>
      ) : null}
      {notes.map((n) => (
        <View key={n.id} style={styles.note}>
          <Text style={styles.meta}>
            {n.date} · {n.authorRole}
          </Text>
          <Text style={styles.noteBody}>{n.body}</Text>
        </View>
      ))}
      <TextField label="New note" value={body} onChangeText={setBody} multiline />
      <Button title="Add note" onPress={() => void add()} />
    </Screen>
  );
}
