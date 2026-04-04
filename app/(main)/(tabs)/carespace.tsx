import { router, useFocusEffect } from 'expo-router';
import { format, isBefore, isValid, parseISO } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import { effectiveConsumerPersona } from '@/src/lib/effectivePersona';
import * as api from '@/src/lib/serverApi';
import type { CareAccessDto, CareNoteRow, MatchPeer, ShiftDto } from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

const HISTORY_CAP = 50;

function shiftStart(s: ShiftDto): Date {
  return new Date(`${s.date}T${s.startTime}:00`);
}

function shiftEnd(s: ShiftDto): Date {
  return new Date(`${s.date}T${s.endTime}:00`);
}

function isPastShift(s: ShiftDto, now: Date) {
  return isBefore(shiftEnd(s), now);
}

function formatSelectedDayLabel(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'EEEE, MMMM d, yyyy') : iso;
}

function shiftRowA11yLabel(s: ShiftDto, segment: 'upcoming' | 'history' | 'day') {
  const status = s.status.replace(/_/g, ' ');
  const when = `${s.date}, ${s.startTime} to ${s.endTime}`;
  if (segment === 'day') return `Shift on selected day, ${when}, ${status}`;
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
  const user = useAuthStore((s) => s.user);
  const persona = effectiveConsumerPersona(user);
  const myId = user?.id;
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [access, setAccess] = useState<CareAccessDto | null>(null);
  const [shifts, setShifts] = useState<ShiftDto[]>([]);
  const [notes, setNotes] = useState<CareNoteRow[]>([]);
  const [matches, setMatches] = useState<MatchPeer[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const carePeers = useMemo(() => {
    if (persona === 'family') return matches.filter((m) => m.role === 'caregiver');
    if (persona === 'caregiver') return matches.filter((m) => m.role === 'family');
    return [];
  }, [matches, persona]);

  const reloadShiftsOnly = useCallback(async () => {
    try {
      const sh = await api.shiftsList();
      setShifts(sh.shifts);
    } catch {
      /* ignore */
    }
  }, []);

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
            persona === 'family'
              ? m.matches.filter((x) => x.role === 'caregiver')
              : persona === 'caregiver'
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
    }, [persona]),
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
    if (persona === 'family') return shifts.filter((s) => s.caregiverUserId === selectedPeerId);
    if (persona === 'caregiver') return shifts.filter((s) => s.familyUserId === selectedPeerId);
    return shifts;
  }, [shifts, selectedPeerId, persona]);

  const latestNoteForPeer = useMemo(() => {
    if (!myId || !selectedPeerId) return null;
    let relevant = notes.filter((n) => noteForPair(n, myId, selectedPeerId));
    if (selectedDate) relevant = relevant.filter((n) => n.date === selectedDate);
    if (relevant.length === 0) return null;
    const sorted = [...relevant].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return sorted[0]?.body ?? null;
  }, [notes, myId, selectedPeerId, selectedDate]);

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

  const shiftsOnSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return [...shiftsForPeer.filter((s) => s.date === selectedDate)].sort(
      (a, b) => a.startTime.localeCompare(b.startTime),
    );
  }, [shiftsForPeer, selectedDate]);

  const markedDates = useMemo(() => {
    const m: Record<
      string,
      { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }
    > = {};
    for (const s of shiftsForPeer) {
      const prev = m[s.date];
      m[s.date] = { ...prev, marked: true, dotColor: c.primary };
    }
    if (selectedDate) {
      const prev = m[selectedDate];
      m[selectedDate] = {
        marked: prev?.marked ?? false,
        dotColor: c.primary,
        selected: true,
        selectedColor: c.primary,
      };
    }
    return m;
  }, [shiftsForPeer, selectedDate, c.primary]);

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
      dateFocusBannerBox: {
        marginBottom: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: c.primaryMuted,
        borderWidth: 1,
        borderColor: c.border,
      },
      dateFocusBannerTitle: { ...t.body },
      clearDate: { ...t.caption, color: c.primaryDark, fontWeight: '600', fontFamily: f.semibold, marginTop: spacing.sm },
      familyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs, paddingLeft: spacing.md, paddingBottom: spacing.sm },
      actionLink: { ...t.caption, color: c.primaryDark, fontWeight: '600', fontFamily: f.semibold, textDecorationLine: 'underline' },
      actionLinkDanger: { ...t.caption, color: c.danger, fontWeight: '600', fontFamily: f.semibold, textDecorationLine: 'underline' },
      dayEmpty: { ...t.bodySecondary, marginTop: spacing.sm },
    });
  }, [c, f]);

  const openShift = (s: ShiftDto) => router.push(`/shift/${s.id}`);

  const familyReopen = (s: ShiftDto) => {
    void (async () => {
      try {
        await api.shiftPatch(s.id, { status: 'pending' });
        await reloadShiftsOnly();
        Alert.alert('Re-opened', 'The caregiver can respond to this shift again.');
      } catch (e) {
        Alert.alert('Shift', e instanceof Error ? e.message : 'Failed');
      }
    })();
  };

  const familyDelete = (s: ShiftDto) => {
    Alert.alert(
      'Delete this shift?',
      'Removes it from CareSpace for you and the caregiver. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const r = await api.shiftDelete(s.id);
                await reloadShiftsOnly();
                if (r.calendarWarnings?.length) {
                  Alert.alert('Removed', r.calendarWarnings.join('\n\n'));
                }
              } catch (e) {
                Alert.alert('Shift', e instanceof Error ? e.message : 'Failed');
              }
            })();
          },
        },
      ],
    );
  };

  const renderShiftRow = (s: ShiftDto, segment: 'upcoming' | 'history' | 'day') => (
    <View key={s.id}>
      <Pressable
        style={styles.historyRow}
        accessibilityRole="button"
        accessibilityLabel={shiftRowA11yLabel(s, segment)}
        onPress={() => openShift(s)}>
        <View style={styles.historyMain}>
          {segment === 'day' ? null : (
            <Text style={styles.historyDate}>
              {s.date} · {s.startTime}–{s.endTime}
            </Text>
          )}
          {segment === 'day' ? (
            <Text style={styles.historyDate}>
              {s.startTime}–{s.endTime}
            </Text>
          ) : null}
          {s.notes ? (
            <Text style={styles.historyNotes} numberOfLines={2}>
              {s.notes}
            </Text>
          ) : null}
        </View>
        <Text style={styles.historyStatus} importantForAccessibility="no">
          {s.status.replace(/_/g, ' ')}
        </Text>
      </Pressable>
      {persona === 'family' && s.status === 'canceled' ? (
        <View style={styles.familyActions}>
          <Pressable onPress={() => familyReopen(s)} accessibilityRole="button" accessibilityLabel="Re-open shift">
            <Text style={styles.actionLink}>Re-open</Text>
          </Pressable>
          <Pressable onPress={() => familyDelete(s)} accessibilityRole="button" accessibilityLabel="Delete shift">
            <Text style={styles.actionLinkDanger}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

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
        <EmptyState
          title="Scheduling and notes are locked"
          description="Start a free 7-day trial to share your calendar, confirm shifts, and keep care notes with matches. Or subscribe anytime from billing."
          primaryAction={{ title: 'Start 7-day trial', onPress: () => void startTrial() }}
          secondaryAction={{
            title: 'Subscribe with Stripe',
            onPress: () => router.push('/subscription'),
            variant: 'secondary',
          }}
        />
        <View style={{ marginTop: spacing.sm }}>
          <Button title="How CareSpace works" variant="ghost" onPress={() => router.push('/help')} />
        </View>
      </Screen>
    );
  }

  const peerLabel = persona === 'family' ? 'caregiver' : 'family';

  const onDayPress = (day: { dateString: string }) => {
    setSelectedDate((prev) => (prev === day.dateString ? null : day.dateString));
  };

  const goAddShift = () => {
    if (!selectedPeerId) {
      Alert.alert('No caregiver yet', 'Match with a caregiver from Discover before scheduling a shift.');
      return;
    }
    router.push({
      pathname: '/shift/new',
      params: {
        caregiverUserId: selectedPeerId,
        ...(selectedDate ? { date: selectedDate } : {}),
      },
    });
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>CareSpace</Text>
      <Text style={styles.sub}>
        Pick a connection and optionally a calendar day — lists and notes update for that context. Families can re-open
        canceled shifts or delete them from history.
      </Text>
      {carePeers.length > 1 ? (
        <>
          <Text style={styles.sectionTitle}>Which {peerLabel}?</Text>
          <Text style={styles.pickerHint}>Shifts and notes below follow this match.</Text>
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

      <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Calendar</Text>
      <Text style={styles.pickerHint}>Tap a date to focus this screen on that day. Tap the same date again to return to the full upcoming view.</Text>
      <Calendar
        markedDates={markedDates}
        onDayPress={onDayPress}
        theme={calendarTheme}
        enableSwipeMonths
      />

      {selectedDate ? (
        <View style={{ marginTop: spacing.md }}>
          <View style={styles.dateFocusBannerBox}>
            <Text style={styles.dateFocusBannerTitle}>Showing: {formatSelectedDayLabel(selectedDate)}</Text>
            <Pressable onPress={() => setSelectedDate(null)} accessibilityRole="button" accessibilityLabel="Clear date filter">
              <Text style={styles.clearDate}>Clear date filter</Text>
            </Pressable>
          </View>
          {shiftsOnSelectedDay.length === 0 ? (
            <Text style={styles.dayEmpty}>No shifts with this connection on this date.</Text>
          ) : (
            <View style={styles.listBlock}>
              <Text style={styles.sectionTitle}>Shifts on this date</Text>
              {shiftsOnSelectedDay.map((s) => renderShiftRow(s, 'day'))}
            </View>
          )}
        </View>
      ) : (
        <>
          {next ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Next shift</Text>
              <Text style={styles.cardBody}>
                {next.date} · {next.startTime}–{next.endTime}
              </Text>
              <Text style={styles.cardMuted}>{next.notes}</Text>
              <Text style={styles.badge}>Status: {next.status}</Text>
              {persona === 'caregiver' ? (
                <Button title="Respond to shift" variant="secondary" onPress={() => router.push(`/shift/${next.id}`)} />
              ) : null}
            </Card>
          ) : shiftsForPeer.length === 0 ? (
            <Text style={styles.emptyUpcoming}>No shifts yet.{persona === 'family' ? ' Add a shift when you have a match.' : ''}</Text>
          ) : (
            <Text style={styles.emptyUpcoming}>
              No upcoming shifts. Pick a date on the calendar or see history below
              {persona === 'family' ? ', or add a new shift.' : '.'}
            </Text>
          )}
          {moreUpcoming.length > 0 ? (
            <View style={styles.listBlock}>
              <Text style={styles.sectionTitle}>More upcoming</Text>
              {moreUpcoming.map((s) => renderShiftRow(s, 'upcoming'))}
            </View>
          ) : null}
          {historyRows.length > 0 ? (
            <View style={styles.listBlock}>
              <Text style={styles.sectionTitle}>Shift history</Text>
              <Text style={styles.pickerHint}>Family: use Re-open or Delete on canceled rows. Tap a row for full details.</Text>
              {historyRows.map((s) => renderShiftRow(s, 'history'))}
            </View>
          ) : null}
        </>
      )}

      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        {persona === 'family' ? (
          <Button title="Add shift" onPress={goAddShift} />
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
        <Text style={styles.cardTitle}>{selectedDate ? 'Note on this date' : 'Latest note'}</Text>
        <Text style={styles.cardBody} numberOfLines={3}>
          {latestNoteForPeer ?? 'No notes yet.'}
        </Text>
      </View>
    </Screen>
  );
}
