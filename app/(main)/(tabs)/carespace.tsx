import { router, useFocusEffect } from 'expo-router';
import { isBefore } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import type { CareAccessDto, CareNoteRow, MatchPeer, ShiftDto } from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

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

function noteForPair(n: CareNoteRow, me: string, peer: string): boolean {
  return (
    (n.familyUserId === me && n.caregiverUserId === peer) ||
    (n.caregiverUserId === me && n.familyUserId === peer)
  );
}

export default function CareSpaceScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const role = useAuthStore((s) => s.user?.role);
  const myId = useAuthStore((s) => s.user?.id);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [access, setAccess] = useState<CareAccessDto | null>(null);
  const [shifts, setShifts] = useState<ShiftDto[]>([]);
  const [notes, setNotes] = useState<CareNoteRow[]>([]);
  const [matches, setMatches] = useState<MatchPeer[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [loading, setLoading] = useState(true);

  const carePeers = useMemo(() => {
    if (role === 'family') return matches.filter((m) => m.role === 'caregiver');
    if (role === 'caregiver') return matches.filter((m) => m.role === 'family');
    return [];
  }, [matches, role]);

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
          setNotes(n.notes);
          setMatches(m.matches);
          const peers =
            role === 'family'
              ? m.matches.filter((x) => x.role === 'caregiver')
              : role === 'caregiver'
                ? m.matches.filter((x) => x.role === 'family')
                : [];
          setSelectedPeerId((cur) => {
            if (cur && peers.some((p) => p.id === cur)) return cur;
            if (peers.length >= 1) return peers[0].id;
            return '';
          });
        } catch {
          if (!cancelled) {
            setAccess(null);
            setShifts([]);
            setNotes([]);
            setMatches([]);
            setSelectedPeerId('');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [role]),
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

  const shiftsForPeer = useMemo(() => {
    if (!selectedPeerId) return shifts;
    if (role === 'family') return shifts.filter((s) => s.caregiverUserId === selectedPeerId);
    if (role === 'caregiver') return shifts.filter((s) => s.familyUserId === selectedPeerId);
    return shifts;
  }, [shifts, selectedPeerId, role]);

  const latestNoteForPeer = useMemo(() => {
    if (!myId || !selectedPeerId) return null;
    const relevant = notes.filter((n) => noteForPair(n, myId, selectedPeerId));
    if (relevant.length === 0) return null;
    const sorted = [...relevant].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return sorted[0]?.body ?? null;
  }, [notes, myId, selectedPeerId]);

  const { next, historyRows, moreUpcoming } = useMemo(() => {
    const now = new Date();
    const upcomingRaw = shiftsForPeer.filter((s) => s.status !== 'canceled' && !isPastShift(s, now));
    const upcomingSorted = [...upcomingRaw].sort((a, b) => shiftStart(a).getTime() - shiftStart(b).getTime());
    const first = upcomingSorted[0] ?? null;
    const historyCandidates = shiftsForPeer.filter((s) => s.status === 'canceled' || isPastShift(s, now));
    const historySorted = [...historyCandidates].sort((a, b) => shiftStart(b).getTime() - shiftStart(a).getTime());
    const historyRows = historySorted.slice(0, HISTORY_CAP);
    const moreUpcoming = first ? upcomingSorted.filter((s) => s.id !== first.id) : upcomingSorted;
    return { next: first, historyRows, moreUpcoming };
  }, [shiftsForPeer]);
  const marked = useMemo(
    () => Object.fromEntries(shiftsForPeer.map((s) => [s.date, { marked: true, dotColor: c.primary }])),
    [shiftsForPeer, c.primary],
  );
  const calendarTheme = useMemo(
    () => ({ todayTextColor: c.primary, selectedDayBackgroundColor: c.primary }),
    [c.primary],
  );
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.xs },
      sub: { ...t.sub, marginVertical: layout.sectionGap - spacing.sm },
      card: { marginBottom: spacing.md },
      emptyUpcoming: { ...t.bodySecondary, marginBottom: spacing.md },
      cardTitle: { ...t.label, color: c.primaryDark },
      cardBody: { ...t.body, marginTop: spacing.xs },
      cardMuted: { ...t.caption, marginTop: spacing.sm },
      badge: { ...t.caption, marginTop: spacing.sm, fontWeight: '600', color: c.text, fontFamily: f.semibold },
      listBlock: { marginTop: spacing.lg },
      sectionTitle: {
        ...t.label,
        color: c.primaryDark,
        marginBottom: spacing.sm,
      },
      historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: layout.listRowMinHeight,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
        backgroundColor: c.surface,
      },
      historyMain: { flex: 1, marginRight: spacing.sm, minWidth: 0 },
      historyDate: { ...t.sub, fontWeight: '600', color: c.text, fontFamily: f.semibold },
      historyNotes: { ...t.caption, fontSize: 13, marginTop: 2 },
      historyStatus: { ...t.caption, fontSize: 13, fontWeight: '600', fontFamily: f.semibold },
      notePreview: { marginTop: spacing.lg },
      pick: {
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: spacing.sm,
      },
      pickOn: { borderColor: c.primary, backgroundColor: c.primaryMuted },
      pickText: { ...t.body },
      pickerHint: { ...t.caption, marginBottom: spacing.sm },
    });
  }, [c, f]);

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
          Unlock shared scheduling, shift confirmations, and care notes with a 7-day trial or subscription.
        </Text>
        <View style={{ gap: spacing.md }}>
          <Button title="Start 7-day trial" onPress={() => void startTrial()} />
          <Button title="Subscribe (Stripe)" variant="secondary" onPress={() => router.push('/subscription')} />
        </View>
      </Screen>
    );
  }

  const peerLabel = role === 'family' ? 'caregiver' : 'family';

  return (
    <Screen scroll>
      <Text style={styles.h1}>CareSpace</Text>
      <Text style={styles.sub}>Next shift, calendar, and notes — shared with your matches.</Text>
      {carePeers.length > 1 ? (
        <>
          <Text style={styles.sectionTitle}>Which {peerLabel}?</Text>
          <Text style={styles.pickerHint}>Shifts and the note preview below are for the selected match.</Text>
          {carePeers.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.pick, selectedPeerId === m.id && styles.pickOn]}
              accessibilityRole="button"
              accessibilityLabel={`CareSpace with ${m.displayName}${m.city ? `, ${m.city}` : ''}`}
              accessibilityState={{ selected: selectedPeerId === m.id }}
              onPress={() => setSelectedPeerId(m.id)}>
              <Text style={styles.pickText} importantForAccessibility="no">
                {m.displayName}
                {m.city ? ` · ${m.city}` : ''}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}
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
      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        {role === 'family' ? (
          <Button
            title="Add shift"
            onPress={() => {
              if (!selectedPeerId) {
                Alert.alert('No caregiver yet', 'Match with a caregiver from Discover before scheduling a shift.');
                return;
              }
              router.push({ pathname: '/shift/new', params: { caregiverUserId: selectedPeerId } });
            }}
          />
        ) : null}
        <Button
          title="Care notes"
          variant="secondary"
          onPress={() => {
            if (selectedPeerId) router.push({ pathname: '/care-notes', params: { peerUserId: selectedPeerId } });
            else router.push('/care-notes');
          }}
        />
      </View>
      <View style={styles.notePreview}>
        <Text style={styles.cardTitle}>Latest note</Text>
        <Text style={styles.cardBody} numberOfLines={3}>
          {latestNoteForPeer ?? 'No notes yet.'}
        </Text>
      </View>
    </Screen>
  );
}
