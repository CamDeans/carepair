import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { spacing } from '@/src/theme/tokens';

export default function ShiftDetailScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [shift, setShift] = useState<api.ShiftDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle },
      line: { ...t.body, marginTop: spacing.sm },
      notes: { ...t.sub, marginTop: spacing.sm },
      status: { ...t.body, fontWeight: '600', marginVertical: spacing.md, fontFamily: f.semibold },
      section: {
        ...t.label,
        color: c.primaryDark,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
      },
      row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
      flex: { flex: 1 },
    });
  }, [c, f]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { shift: s } = await api.shiftGet(id);
        if (!cancelled) {
          setShift(s);
          setEditDate(s.date);
          setEditStart(s.startTime);
          setEditEnd(s.endTime);
          setEditNotes(s.notes);
        }
      } catch {
        if (!cancelled) setShift(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const setStatus = async (status: 'confirmed' | 'change_requested') => {
    if (!shift) return;
    try {
      const { calendarWarnings } = await api.shiftPatch(shift.id, { status });
      if (calendarWarnings?.length) {
        Alert.alert(
          status === 'confirmed' ? 'Shift confirmed' : 'Shift updated',
          calendarWarnings.join('\n\n'),
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Shift', e instanceof Error ? e.message : 'Failed');
    }
  };

  const isFamilyOwner =
    user?.role === 'family' && shift !== null && shift.familyUserId === user.id;

  const cancelShift = async () => {
    if (!shift) return;
    try {
      const { calendarWarnings } = await api.shiftPatch(shift.id, { status: 'canceled' });
      if (calendarWarnings?.length) {
        Alert.alert('Shift canceled', calendarWarnings.join('\n\n'), [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Shift', e instanceof Error ? e.message : 'Failed');
    }
  };

  const saveSchedule = async () => {
    if (!shift) return;
    setSaving(true);
    try {
      const { shift: next, calendarWarnings } = await api.shiftPatch(shift.id, {
        date: editDate.trim(),
        startTime: editStart.trim(),
        endTime: editEnd.trim(),
        notes: editNotes.trim(),
      });
      setShift((prev) =>
        prev
          ? {
              ...prev,
              date: next.date,
              startTime: next.startTime,
              endTime: next.endTime,
              notes: next.notes,
            }
          : prev,
      );
      const lines = ['Shift updated.'];
      if (shift.status === 'confirmed') {
        lines.push('Google Calendar is updated for confirmed shifts.');
      }
      if (calendarWarnings?.length) {
        lines.push(...calendarWarnings);
      }
      Alert.alert('Saved', lines.join('\n\n'));
    } catch (e) {
      Alert.alert('Shift', e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={c.primary} />
      </Screen>
    );
  }

  if (!shift) {
    return (
      <Screen>
        <Text>Shift not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.h1}>Shift</Text>
      <Text style={styles.line}>
        {shift.date} · {shift.startTime}–{shift.endTime}
      </Text>
      <Text style={styles.notes}>{shift.notes}</Text>
      <Text style={styles.status}>Status: {shift.status}</Text>
      {user?.role === 'caregiver' && shift.status === 'pending' ? (
        <Text style={styles.notes}>
          Review the time below, then accept to confirm with the family or request a change.
        </Text>
      ) : null}

      {isFamilyOwner ? (
        <>
          <Text style={styles.section}>Edit schedule (family)</Text>
          <TextField label="Date (YYYY-MM-DD)" value={editDate} onChangeText={setEditDate} />
          <TextField label="Start (HH:MM)" value={editStart} onChangeText={setEditStart} />
          <TextField label="End (HH:MM)" value={editEnd} onChangeText={setEditEnd} />
          <TextField label="Notes" value={editNotes} onChangeText={setEditNotes} multiline />
          <Button title={saving ? 'Saving…' : 'Save schedule'} onPress={() => void saveSchedule()} loading={saving} />
        </>
      ) : null}

      {user?.role === 'caregiver' && shift.status !== 'canceled' && shift.status !== 'confirmed' ? (
        <View style={styles.row}>
          <Button title="Accept" onPress={() => void setStatus('confirmed')} style={styles.flex} />
          <Button title="Request change" variant="secondary" onPress={() => void setStatus('change_requested')} style={styles.flex} />
        </View>
      ) : null}

      {shift.status !== 'canceled' ? (
        <Button
          title="Cancel shift"
          variant="ghost"
          onPress={() =>
            Alert.alert('Cancel shift?', 'Linked Google Calendar events will be removed when possible.', [
              { text: 'Keep', style: 'cancel' },
              { text: 'Cancel shift', style: 'destructive', onPress: () => void cancelShift() },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}
