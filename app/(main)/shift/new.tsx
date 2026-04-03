import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { formatZodError, isoDateSchema, timeHmSchema } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

const shiftDraftSchema = z
  .object({
    date: isoDateSchema,
    startTime: timeHmSchema,
    endTime: timeHmSchema,
    notes: z.string().max(500).optional().default(''),
  })
  .refine((d) => d.startTime < d.endTime, { message: 'End time must be after start time', path: ['endTime'] });

export default function NewShiftScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const { caregiverUserId: paramCg, date: paramDate } = useLocalSearchParams<{
    caregiverUserId?: string;
    date?: string;
  }>();
  const [caregiverUserId, setCaregiverUserId] = useState('');
  const [matches, setMatches] = useState<api.MatchPeer[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('19:00');
  const [notes, setNotes] = useState('');

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, marginBottom: layout.sectionGap - spacing.sm },
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
    });
  }, [c, f]);

  useEffect(() => {
    if (paramCg) setCaregiverUserId(paramCg);
  }, [paramCg]);

  useEffect(() => {
    if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)) setDate(paramDate);
  }, [paramDate]);

  useEffect(() => {
    void (async () => {
      try {
        const { matches: m } = await api.matchesList();
        const cgs = m.filter((x) => x.role === 'caregiver');
        setMatches(cgs);
        setCaregiverUserId((cur) => {
          if (paramCg) return paramCg;
          if (cur) return cur;
          if (cgs.length === 1) return cgs[0].id;
          return cur;
        });
      } catch {
        setMatches([]);
      }
    })();
  }, [paramCg]);

  const save = async () => {
    const v = shiftDraftSchema.safeParse({ date, startTime, endTime, notes });
    if (!v.success) {
      Alert.alert('Check shift details', formatZodError(v.error));
      return;
    }
    if (!caregiverUserId.trim()) {
      Alert.alert('Caregiver', 'Choose a matched caregiver.');
      return;
    }
    try {
      await api.shiftCreate({
        caregiverUserId: caregiverUserId.trim(),
        date: v.data.date,
        startTime: v.data.startTime,
        endTime: v.data.endTime,
        notes: v.data.notes,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      const overlap =
        /overlap/i.test(msg) || /another shift/i.test(msg) || /different slot/i.test(msg);
      Alert.alert(overlap ? 'Scheduling conflict' : 'Shift', msg);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Add shift</Text>
      <Text style={styles.label}>Caregiver</Text>
      {matches.map((m) => (
        <Pressable
          key={m.id}
          style={[styles.pick, caregiverUserId === m.id && styles.pickOn]}
          accessibilityRole="button"
          accessibilityLabel={`Caregiver ${m.displayName}`}
          accessibilityState={{ selected: caregiverUserId === m.id }}
          onPress={() => setCaregiverUserId(m.id)}>
          <Text style={styles.pickText} importantForAccessibility="no">
            {m.displayName} · {m.city ?? ''}
          </Text>
        </Pressable>
      ))}
      {matches.length === 0 ? <Text style={styles.hint}>No matched caregivers. Match in Discover first.</Text> : null}
      <TextField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <TextField label="Start (HH:MM)" value={startTime} onChangeText={setStartTime} />
      <TextField label="End (HH:MM)" value={endTime} onChangeText={setEndTime} />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Button title="Send for confirmation" onPress={() => void save()} />
    </Screen>
  );
}
