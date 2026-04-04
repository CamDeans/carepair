import { router, useFocusEffect } from 'expo-router';
import { format, isBefore, isValid, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

import { UserProfileStrip } from '@/src/components/UserProfileStrip';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import { effectiveConsumerPersona } from '@/src/lib/effectivePersona';
import * as api from '@/src/lib/serverApi';
import type { CareAccessDto, CareNoteRow, GoogleCalendarEventDto, MatchPeer, ShiftDto } from '@/src/lib/serverApi';
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

/** Local calendar dates (yyyy-MM-dd) an event touches, for dots and day filtering. */
function eachLocalDayBetween(startIso: string, endIso: string, allDay: boolean): string[] {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  let endInclusive = new Date(endDay);
  if (allDay) {
    endInclusive.setDate(endInclusive.getDate() - 1);
  }
  if (endInclusive < startDay) {
    return [format(startDay, 'yyyy-MM-dd')];
  }
  const out: string[] = [];
  const cur = new Date(startDay);
  while (cur <= endInclusive) {
    out.push(format(cur, 'yyyy-MM-dd'));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function formatGoogleEventWhen(ev: GoogleCalendarEventDto): string {
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  if (ev.allDay) {
    const days = eachLocalDayBetween(ev.start, ev.end, true);
    if (days.length === 0) return format(s, 'MMM d, yyyy');
    if (days.length === 1) return format(parseISO(days[0]!), 'MMM d, yyyy');
    return `${format(parseISO(days[0]!), 'MMM d')} – ${format(parseISO(days[days.length - 1]!), 'MMM d, yyyy')}`;
  }
  return `${format(s, 'MMM d, h:mm a')} – ${format(e, 'h:mm a')}`;
}

function eventTouchesYmd(ev: GoogleCalendarEventDto, ymd: string): boolean {
  return eachLocalDayBetween(ev.start, ev.end, ev.allDay).includes(ymd);
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
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEventDto[]>([]);
  const [googleMeta, setGoogleMeta] = useState<{ connected: boolean; error?: string }>({ connected: false });
  const [refreshing, setRefreshing] = useState(false);

  const applyCareSpaceResponse = useCallback(
    (a: CareAccessDto, shiftRows: ShiftDto[], notesRows: CareNoteRow[], mat: MatchPeer[]) => {
      setAccess(a);
      setShifts(shiftRows);
      setNotes(notesRows);
      setMatches(mat);
      const peers =
        persona === 'family'
          ? mat.filter((x) => x.role === 'caregiver')
          : persona === 'caregiver'
            ? mat.filter((x) => x.role === 'family')
            : [];
      setSelectedPeerId((cur) => {
        if (cur && peers.some((p) => p.id === cur)) return cur;
        if (peers.length >= 1) return peers[0].id;
        return '';
      });
    },
    [persona],
  );

  const loadGoogleCalendarForVisibleMonth = useCallback(async () => {
    const { year, month } = visibleMonth;
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    try {
      const r = await api.googleCalendarEvents(start.toISOString(), end.toISOString());
      setGoogleMeta({ connected: r.connected, error: r.error });
      setGoogleEvents(r.events);
    } catch {
      setGoogleEvents([]);
      setGoogleMeta({ connected: true, error: 'Could not load Google Calendar events.' });
    }
  }, [visibleMonth.year, visibleMonth.month]);

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
          applyCareSpaceResponse(a, sh.shifts, n.notes, m.matches);
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
    }, [applyCareSpaceResponse]),
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMe();
      try {
        const [a, sh, n, m] = await Promise.all([
          api.subscriptionCareAccess(),
          api.shiftsList(),
          api.notesList(),
          api.matchesList(),
        ]);
        applyCareSpaceResponse(a, sh.shifts, n.notes, m.matches);
        const u = useAuthStore.getState().user;
        if (a.canUseCareSpace && u?.googleCalendarConnected === true) {
          await loadGoogleCalendarForVisibleMonth();
        } else {
          setGoogleEvents([]);
          setGoogleMeta({ connected: false });
        }
      } catch {
        setAccess(null);
        setShifts([]);
        setNotes([]);
        setMatches([]);
        setSelectedPeerId('');
        setGoogleEvents([]);
        setGoogleMeta({ connected: false });
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshMe, applyCareSpaceResponse, loadGoogleCalendarForVisibleMonth]);

  const unlocked = access != null && access.canUseCareSpace;
  const googleLinked = user?.googleCalendarConnected === true;

  useEffect(() => {
    if (!unlocked || !googleLinked) {
      setGoogleEvents([]);
      setGoogleMeta({ connected: false });
      return;
    }
    void loadGoogleCalendarForVisibleMonth();
  }, [unlocked, googleLinked, loadGoogleCalendarForVisibleMonth]);

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

  const googleOnSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return googleEvents
      .filter((ev) => eventTouchesYmd(ev, selectedDate))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [googleEvents, selectedDate]);

  const upcomingGooglePersonal = useMemo(() => {
    const now = Date.now();
    return [...googleEvents]
      .filter((e) => new Date(e.end).getTime() >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 12);
  }, [googleEvents]);

  const markedDates = useMemo(() => {
    type Dot = { color: string };
    const byDate: Record<string, { dots: Dot[] }> = {};
    const addDot = (date: string, color: string) => {
      const cur = byDate[date] ?? { dots: [] as Dot[] };
      if (!cur.dots.some((d) => d.color === color)) cur.dots.push({ color });
      byDate[date] = cur;
    };

    for (const s of shiftsForPeer) {
      addDot(s.date, c.success);
    }
    for (const ev of googleEvents) {
      for (const d of eachLocalDayBetween(ev.start, ev.end, ev.allDay)) {
        addDot(d, c.textSecondary);
      }
    }

    const m: Record<string, Record<string, unknown>> = {};
    for (const [date, { dots }] of Object.entries(byDate)) {
      m[date] = { marked: true, dots };
    }
    if (selectedDate) {
      const prev = m[selectedDate] ?? { dots: [] as Dot[] };
      m[selectedDate] = {
        ...prev,
        marked: true,
        dots: (prev.dots as Dot[]) ?? [],
        selected: true,
        selectedColor: c.primary,
        selectedTextColor: c.onPrimary,
      };
    }
    return m;
  }, [shiftsForPeer, googleEvents, selectedDate, c.primary, c.success, c.textSecondary, c.onPrimary]);

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: c.background,
      calendarBackground: c.surface,
      textSectionTitleColor: c.textSecondary,
      monthTextColor: c.text,
      textMonthFontWeight: '600' as const,
      dayTextColor: c.text,
      textDayFontWeight: '500' as const,
      todayTextColor: c.primary,
      todayBackgroundColor: c.brandYellowTint,
      selectedDayBackgroundColor: c.primary,
      selectedDayTextColor: c.onPrimary,
      textDisabledColor: c.textSubtle,
      dotColor: c.success,
      selectedDotColor: c.onPrimary,
      arrowColor: c.primary,
    }),
    [c],
  );

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.md },
      card: { marginBottom: spacing.md },
      emptyUpcoming: { ...t.bodySecondary, marginBottom: spacing.md },
      cardTitle: { ...t.label, color: c.text },
      cardBody: { ...t.body, marginTop: spacing.xs },
      cardMuted: { ...t.caption, marginTop: spacing.sm },
      badge: { ...t.caption, marginTop: spacing.sm, fontWeight: '600', color: c.text, fontFamily: f.semibold },
      listBlock: { marginTop: spacing.lg },
      sectionTitle: {
        ...t.label,
        color: c.text,
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
      dateFocusBannerTitle: { ...t.body, color: c.brandYellowText },
      clearDate: { ...t.caption, color: c.brandYellowText, fontWeight: '600', fontFamily: f.semibold, marginTop: spacing.sm },
      familyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs, paddingLeft: spacing.md, paddingBottom: spacing.sm },
      actionLink: { ...t.caption, color: c.primary, fontWeight: '600', fontFamily: f.semibold, textDecorationLine: 'underline' },
      actionLinkDanger: { ...t.caption, color: c.danger, fontWeight: '600', fontFamily: f.semibold, textDecorationLine: 'underline' },
      dayEmpty: { ...t.bodySecondary, marginTop: spacing.sm },
      googleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: layout.listRowMinHeight,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
        backgroundColor: c.surface,
        borderLeftWidth: 3,
        borderLeftColor: c.textSecondary,
      },
      googleMain: { flex: 1, marginRight: spacing.sm, minWidth: 0 },
      googleTitle: { ...t.sub, fontWeight: '600', color: c.text, fontFamily: f.semibold },
      googleWhen: { ...t.caption, fontSize: 13, marginTop: 2, color: c.textSecondary },
      googleLoc: { ...t.caption, fontSize: 12, marginTop: 2, color: c.textSubtle },
      googleOpenHint: { ...t.caption, fontSize: 12, fontWeight: '600', fontFamily: f.semibold, color: c.primary },
      googleLegend: { ...t.caption, marginTop: spacing.xs, color: c.textSecondary },
      googleError: { ...t.caption, marginTop: spacing.sm, color: c.danger },
      googleHint: { ...t.caption, marginTop: spacing.sm, color: c.textSecondary },
    });
  }, [c, f]);

  const openShift = (s: ShiftDto) => router.push(`/shift/${s.id}`);

  const openGoogleCalendarEvent = (ev: GoogleCalendarEventDto) => {
    if (ev.htmlLink) void Linking.openURL(ev.htmlLink);
    else Alert.alert('Google Calendar', 'No link is available for this event.');
  };

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

  const renderGoogleRow = (ev: GoogleCalendarEventDto) => (
    <Pressable
      key={ev.id}
      style={styles.googleRow}
      accessibilityRole="button"
      accessibilityLabel={`Google Calendar: ${ev.summary}, ${formatGoogleEventWhen(ev)}`}
      onPress={() => openGoogleCalendarEvent(ev)}>
      <View style={styles.googleMain}>
        <Text style={styles.googleTitle} numberOfLines={2}>
          {ev.summary}
        </Text>
        <Text style={styles.googleWhen}>{formatGoogleEventWhen(ev)}</Text>
        {ev.location ? (
          <Text style={styles.googleLoc} numberOfLines={1}>
            {ev.location}
          </Text>
        ) : null}
      </View>
      {ev.htmlLink ? <Text style={styles.googleOpenHint}>Open</Text> : null}
    </Pressable>
  );

  if (loading && !access) {
    return (
      <Screen>
        <ActivityIndicator color={c.primary} />
      </Screen>
    );
  }

  const refreshControlEl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onPullRefresh()}
      tintColor={c.primary}
      colors={[c.primary]}
    />
  );

  if (!unlocked) {
    return (
      <Screen scroll refreshControl={refreshControlEl}>
        <UserProfileStrip />
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
    <Screen scroll refreshControl={refreshControlEl}>
      <UserProfileStrip />
      <Text style={styles.h1}>CareSpace</Text>
      {carePeers.length > 1 ? (
        <>
          <Text style={styles.sectionTitle}>Which {peerLabel}?</Text>
          <Text style={styles.pickerHint}>Applies to the calendar and lists below.</Text>
          {carePeers.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.pick, selectedPeerId === m.id && styles.pickOn]}
              accessibilityRole="button"
              accessibilityLabel={`CareSpace with ${m.displayName}${m.city ? `, ${m.city}` : ''}`}
              accessibilityState={{ selected: selectedPeerId === m.id }}
              onPress={() => setSelectedPeerId(m.id)}>
              <Text
                style={[styles.pickText, selectedPeerId === m.id && { color: c.brandYellowText }]}
                importantForAccessibility="no">
                {m.displayName}
                {m.city ? ` · ${m.city}` : ''}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Calendar</Text>
      <Text style={styles.pickerHint}>Swipe to change month. Tap a day to focus lists below; tap again to clear.</Text>
      <Calendar
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={onDayPress}
        onMonthChange={(mo) => setVisibleMonth({ year: mo.year, month: mo.month })}
        theme={calendarTheme}
        enableSwipeMonths
      />
      {googleMeta.error ? <Text style={styles.googleError}>{googleMeta.error}</Text> : null}
      {!googleLinked ? (
        <Text style={styles.googleHint}>
          Link Google Calendar in Settings to show your other primary-calendar events here alongside CarePair shifts.
        </Text>
      ) : (
        <Text style={styles.googleLegend}>Dots: green = CarePair shifts · gray = your Google Calendar (other events)</Text>
      )}

      {selectedDate ? (
        <View style={{ marginTop: spacing.md }}>
          <View style={styles.dateFocusBannerBox}>
            <Text style={styles.dateFocusBannerTitle}>Showing: {formatSelectedDayLabel(selectedDate)}</Text>
            <Pressable onPress={() => setSelectedDate(null)} accessibilityRole="button" accessibilityLabel="Clear date filter">
              <Text style={styles.clearDate}>Clear date filter</Text>
            </Pressable>
          </View>
          {shiftsOnSelectedDay.length === 0 && googleOnSelectedDay.length === 0 ? (
            <Text style={styles.dayEmpty}>No shifts with this connection and no other Google events on this date.</Text>
          ) : null}
          {shiftsOnSelectedDay.length > 0 ? (
            <View style={styles.listBlock}>
              <Text style={styles.sectionTitle}>CarePair shifts</Text>
              {shiftsOnSelectedDay.map((s) => renderShiftRow(s, 'day'))}
            </View>
          ) : null}
          {googleOnSelectedDay.length > 0 ? (
            <View style={[styles.listBlock, { marginTop: shiftsOnSelectedDay.length ? spacing.lg : 0 }]}>
              <Text style={styles.sectionTitle}>Google Calendar</Text>
              <Text style={styles.pickerHint}>Personal events from your primary calendar (CarePair-created shift events are hidden here).</Text>
              {googleOnSelectedDay.map((ev) => renderGoogleRow(ev))}
            </View>
          ) : null}
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
          {googleLinked && upcomingGooglePersonal.length > 0 ? (
            <View style={styles.listBlock}>
              <Text style={styles.sectionTitle}>Google Calendar (this month)</Text>
              <Text style={styles.pickerHint}>Other primary-calendar events in the month you are viewing. Tap to open in Google.</Text>
              {upcomingGooglePersonal.map((ev) => renderGoogleRow(ev))}
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
