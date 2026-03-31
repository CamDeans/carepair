import { router, useFocusEffect } from 'expo-router';
import { isBefore } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import type { CareAccessDto, MatchPeer, ShiftDto } from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

const HISTORY_CAP = 25;

function shiftStart(s: ShiftDto): Date {
  return new Date(`${s.date}T${s.startTime}:00`);
}

function shiftEnd(s: ShiftDto): Date {
  return new Date(`${s.date}T${s.endTime}:00`);
}

function isPastShift(s: ShiftDto, now: Date) {
  return isBefore(shiftEnd(s), now);
}

function shiftRowA11yLabel(s: ShiftDto, segment: 'upcoming' | 'history') {
  const status = s.status.replace(/_/g, ' ');
  const when = `${s.date}, ${s.startTime} to ${s.endTime}`;
  return segment === 'upcoming'
    ? `Open upcoming shift, ${when}, ${status}`
    : `Open past shift, ${when}, ${status}`;
}

export default function CareSpaceScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const role = useAuthStore((s) => s.user?.role);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [access, setAccess] = useState<CareAccessDto | null>(null);
  const [shifts, setShifts] = useState<ShiftDto[]>([]);
  const [latestNote, setLatestNote] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchPeer[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const [a, sh, n, m] = await Promise.all([
            api.subscriptionCareAccess(),
            api.shiftsList(),
            api.notesList(),
            api.matchesList(),
          ]);
          if (cancelled) return;
          setAccess(a);
          setShifts(sh.shifts);
          setLatestNote(n.notes[0]?.body ?? null);
          setMatches(m.matches);
        } catch {
          if (!cancelled) {
            setAccess(null);
            setShifts([]);
            setLatestNote(null);
            setMatches([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const startTrial = async () => {
    try {
      await api.subscriptionTrial();
      await refreshMe();
      const a = await api.subscriptionCareAccess();
      setAccess(a);
      Alert.alert('Trial started', 'CareSpace is unlocked for 7 days.');
    } catch (e) {
      Alert.alert('Trial', e instanceof Error ? e.message : 'Could not start trial');
    }
  };

  const unlocked = access != null && access.canUseCareSpace;

  const { next, historyRows, moreUpcoming } = useMemo(() => {
    const now = new Date();
    const upcomingRaw = shifts.filter((s) => s.status !== 'canceled' && !isPastShift(s, now));
    const upcomingSorted = [...upcomingRaw].sort((a, b) => shiftStart(a).getTime() - shiftStart(b).getTime());
    const first = upcomingSorted[0] ?? null;
    const historyCandidates = shifts.filter((s) => s.status === 'canceled' || isPastShift(s, now));
    const historySorted = [...historyCandidates].sort((a, b) => shiftStart(b).getTime() - shiftStart(a).getTime());
    const historyRows = historySorted.slice(0, HISTORY_CAP);
    const moreUpcoming = first ? upcomingSorted.filter((s) => s.id !== first.id) : upcomingSorted;
    return { next: first, historyRows, moreUpcoming };
  }, [shifts]);
  const marked = useMemo(
    () => Object.fromEntries(shifts.map((s) => [s.date, { marked: true, dotColor: c.primary }])),
    [shifts, c.primary],
  );
  const calendarTheme = useMemo(
    () => ({ todayTextColor: c.primary, selectedDayBackgroundColor: c.primary }),
    [c.primary],
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: { fontSize: 28, fontWeight: '800', color: c.text, fontFamily: f.semibold },
        sub: { fontSize: 15, color: c.textSecondary, marginVertical: spacing.md, fontFamily: f.regular },
        card: { marginBottom: spacing.md },
        emptyUpcoming: { fontSize: 15, color: c.textSecondary, marginBottom: spacing.md, fontFamily: f.regular },
        cardTitle: { fontSize: 14, fontWeight: '700', color: c.primaryDark, fontFamily: f.semibold },
        cardBody: { fontSize: 16, color: c.text, marginTop: spacing.xs, fontFamily: f.regular },
        cardMuted: { fontSize: 14, color: c.textSecondary, marginTop: spacing.sm, fontFamily: f.regular },
        badge: { marginTop: spacing.sm, fontWeight: '600', color: c.text, fontFamily: f.semibold },
        listBlock: { marginTop: spacing.lg },
        sectionTitle: {
          fontSize: 15,
          fontWeight: '700',
          color: c.primaryDark,
          marginBottom: spacing.sm,
          fontFamily: f.semibold,
        },
        historyRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          backgroundColor: c.surface,
        },
        historyMain: { flex: 1, marginRight: spacing.sm },
        historyDate: { fontSize: 15, fontWeight: '600', color: c.text, fontFamily: f.semibold },
        historyNotes: { fontSize: 13, color: c.textSecondary, marginTop: 2, fontFamily: f.regular },
        historyStatus: { fontSize: 13, fontWeight: '600', color: c.textSecondary, fontFamily: f.semibold },
        notePreview: { marginTop: spacing.lg },
      }),
    [c, f],
  );
  const defaultCaregiverId = matches.find((m) => m.role === 'caregiver')?.id;

  if (loading && !access) {
    return (
      <Screen>
        <ActivityIndicator color={c.primary} />
      </Screen>
    );
  }

  if (!unlocked) {
    return (
      <Screen scroll>
        <Text style={styles.h1}>CareSpace</Text>
        <Text style={styles.sub}>
          Unlock shared scheduling, shift confirmations, and care notes after you start a trial or subscribe.
        </Text>
        <Button title="Start 7-day trial" onPress={() => void startTrial()} />
        <Button title="Subscribe (Stripe)" variant="secondary" onPress={() => router.push('/subscription')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.h1}>CareSpace</Text>
      <Text style={styles.sub}>Next shift, calendar, and notes — shared with your matches.</Text>
      {next ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Next shift</Text>
          <Text style={styles.cardBody}>
            {next.date} · {next.startTime}–{next.endTime}
          </Text>
          <Text style={styles.cardMuted}>{next.notes}</Text>
          <Text style={styles.badge}>Status: {next.status}</Text>
          {role === 'caregiver' ? (
            <Button title="Respond to shift" variant="secondary" onPress={() => router.push(`/shift/${next.id}`)} />
          ) : null}
        </Card>
      ) : shifts.length === 0 ? (
        <Text style={styles.emptyUpcoming}>No shifts yet.{role === 'family' ? ' Add a shift when you have a match.' : ''}</Text>
      ) : (
        <Text style={styles.emptyUpcoming}>
          No upcoming shifts. See history below
          {role === 'family' ? ' or add a new shift.' : '.'}
        </Text>
      )}
      <Calendar markedDates={marked} theme={calendarTheme} />
      {moreUpcoming.length > 0 ? (
        <View style={styles.listBlock}>
          <Text style={styles.sectionTitle}>More upcoming</Text>
          {moreUpcoming.map((s) => (
            <Pressable
              key={s.id}
              style={styles.historyRow}
              accessibilityRole="button"
              accessibilityLabel={shiftRowA11yLabel(s, 'upcoming')}
              onPress={() => router.push(`/shift/${s.id}`)}>
              <View style={styles.historyMain}>
                <Text style={styles.historyDate}>
                  {s.date} · {s.startTime}–{s.endTime}
                </Text>
                {s.notes ? (
                  <Text style={styles.historyNotes} numberOfLines={1}>
                    {s.notes}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.historyStatus} importantForAccessibility="no">
                {s.status.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {historyRows.length > 0 ? (
        <View style={styles.listBlock}>
          <Text style={styles.sectionTitle}>Shift history</Text>
          {historyRows.map((s) => (
            <Pressable
              key={s.id}
              style={styles.historyRow}
              accessibilityRole="button"
              accessibilityLabel={shiftRowA11yLabel(s, 'history')}
              onPress={() => router.push(`/shift/${s.id}`)}>
              <View style={styles.historyMain}>
                <Text style={styles.historyDate}>
                  {s.date} · {s.startTime}–{s.endTime}
                </Text>
                {s.notes ? (
                  <Text style={styles.historyNotes} numberOfLines={1}>
                    {s.notes}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.historyStatus} importantForAccessibility="no">
                {s.status.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {role === 'family' ? (
        <Button
          title="Add shift"
          onPress={() => {
            if (!defaultCaregiverId) {
              Alert.alert('No caregiver yet', 'Match with a caregiver from Discover before scheduling a shift.');
              return;
            }
            router.push({ pathname: '/shift/new', params: { caregiverUserId: defaultCaregiverId } });
          }}
        />
      ) : null}
      <Button
        title="Care notes"
        variant="secondary"
        onPress={() => {
          const peer = matches[0]?.id;
          if (peer) router.push({ pathname: '/care-notes', params: { peerUserId: peer } });
          else router.push('/care-notes');
        }}
      />
      <View style={styles.notePreview}>
        <Text style={styles.cardTitle}>Latest note</Text>
        <Text style={styles.cardBody} numberOfLines={3}>
          {latestNote ?? 'No notes yet.'}
        </Text>
      </View>
    </Screen>
  );
}
