import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import type { CareNoteRow } from '@/src/lib/serverApi';
import { careNoteBodySchema, formatZodError } from '@/src/lib/validation';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

const MAX_NOTE = 2000;

const TEMPLATES = [
  'Routine went well today.',
  'Mood: positive — engaged with activities.',
  'Sleep: nap at usual time.',
  'Medication given as directed.',
  'Minor incident — family notified separately.',
] as const;

function noteInvolvesPeer(n: CareNoteRow, peerId: string): boolean {
  return n.familyUserId === peerId || n.caregiverUserId === peerId;
}

export default function CareNotesScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { peerUserId: paramPeer } = useLocalSearchParams<{ peerUserId?: string }>();
  const myRole = useAuthStore((s) => s.user?.role);
  const [notes, setNotes] = useState<CareNoteRow[]>([]);
  const [matches, setMatches] = useState<api.MatchPeer[]>([]);
  const [peerUserId, setPeerUserId] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle },
      lead: { ...t.body, marginBottom: spacing.md, lineHeight: 22 },
      sub: { ...t.caption, marginBottom: spacing.sm },
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
      hint: { ...t.caption, marginBottom: spacing.md },
      tmplRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
      tmplChip: {
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      },
      tmplText: { ...t.caption, fontSize: 13 },
      dateHeader: {
        ...t.label,
        color: c.primaryDark,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      },
      note: {
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: spacing.sm,
      },
      meta: { ...t.caption, fontSize: 12, fontWeight: '600', color: c.primaryDark, marginBottom: spacing.xs, fontFamily: f.semibold },
      noteBody: { ...t.sub, color: c.text, lineHeight: 22 },
      count: { ...t.caption, textAlign: 'right', marginTop: spacing.xs },
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
            if (cur && peers.some((p) => p.id === cur)) return cur;
            if (peers.length === 1) return peers[0].id;
            return '';
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

  const filteredNotes = useMemo(() => {
    if (!peerUserId.trim()) return [];
    return notes.filter((n) => noteInvolvesPeer(n, peerUserId.trim()));
  }, [notes, peerUserId]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, CareNoteRow[]>();
    for (const n of filteredNotes) {
      const key = n.date || '—';
      const arr = map.get(key) ?? [];
      arr.push(n);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0));
  }, [filteredNotes]);

  const selectedPeer = matches.find((m) => m.id === peerUserId);

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

  const appendTemplate = (t: string) => {
    setBody((prev) => (prev.trim() ? `${prev.trim()}\n${t}` : t));
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Care notes</Text>
      <Text style={styles.lead}>
        Shared log between you and your match. Notes are dated, tied to one family–caregiver pair, and visible to both sides.
        Use clear, factual entries — avoid sensitive medical detail unless your agreement covers it.
      </Text>
      {loading ? <ActivityIndicator color={c.primary} style={{ marginBottom: spacing.md }} /> : null}
      <Text style={styles.label}>Who is this log with?</Text>
      {matches.map((m) => (
        <Pressable
          key={m.id}
          style={[styles.pick, peerUserId === m.id && styles.pickOn]}
          accessibilityRole="button"
          accessibilityLabel={`Notes with ${m.displayName}${m.city ? `, ${m.city}` : ''}`}
          accessibilityState={{ selected: peerUserId === m.id }}
          onPress={() => setPeerUserId(m.id)}>
          <Text style={styles.pickText} importantForAccessibility="no">
            {m.displayName}
            {m.city ? ` · ${m.city}` : ''}
          </Text>
        </Pressable>
      ))}
      {matches.length === 0 && !loading ? (
        <Text style={styles.hint}>No matches yet — match in Discover first.</Text>
      ) : null}
      {matches.length > 1 ? (
        <Text style={styles.hint}>Several matches: pick who this entry is about before adding a note.</Text>
      ) : null}

      {selectedPeer ? (
        <Text style={styles.sub}>
          Showing notes with <Text style={{ fontWeight: '600' }}>{selectedPeer.displayName}</Text> only.
        </Text>
      ) : null}

      <Text style={styles.dateHeader}>History</Text>
      {!peerUserId.trim() && matches.length > 0 ? (
        <Text style={styles.hint}>Select a match to see their shared notes.</Text>
      ) : null}
      {peerUserId.trim() && notesByDate.length === 0 && !loading ? (
        <Text style={styles.hint}>No notes yet for this pair. Add the first one below.</Text>
      ) : null}
      {notesByDate.map(([date, rows]) => (
        <View key={date}>
          <Text style={styles.sub}>{date}</Text>
          {rows.map((n) => (
            <View key={n.id} style={styles.note}>
              <Text style={styles.meta}>
                {n.authorRole === 'family' ? 'Family' : 'Caregiver'} · author
              </Text>
              <Text style={styles.noteBody}>{n.body}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={[styles.dateHeader, { marginTop: spacing.lg }]}>Add note</Text>
      <Text style={styles.hint}>Quick phrases (tap to append):</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tmplRow}>
        {TEMPLATES.map((t) => (
          <Pressable
            key={t}
            style={styles.tmplChip}
            accessibilityRole="button"
            accessibilityLabel={`Insert ${t}`}
            onPress={() => appendTemplate(t)}>
            <Text style={styles.tmplText} numberOfLines={2}>
              {t}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextField label="Note" value={body} onChangeText={setBody} multiline placeholder="What happened today?" />
      <Text style={styles.count}>
        {body.length}/{MAX_NOTE}
      </Text>
      <Button title="Save note" onPress={() => void add()} />
    </Screen>
  );
}
