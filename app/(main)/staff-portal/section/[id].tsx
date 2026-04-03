import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { STAFF_PORTAL_SECTION_TITLES } from '@/src/constants/staffPortalSections';
import type {
  PortalActivityLogEntry,
  PortalAnnouncementRow,
  PortalRevenueSummary,
  PortalSystemHealthResponse,
  PortalTesterRow,
} from '@/src/lib/serverApi';
import * as api from '@/src/lib/serverApi';
import { emailSchema } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

function useSectionTitle(id: string | undefined) {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    const title = id ? STAFF_PORTAL_SECTION_TITLES[id] ?? 'Section' : 'Section';
    navigation.setOptions({ title });
  }, [id, navigation]);
}

function Card({ children, style }: { children: ReactNode; style?: object }) {
  const { colors: c } = useCarePairUi();
  return (
    <View
      style={[
        {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

function TestersSection() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [allow, setAllow] = useState<api.PortalValuedTesterAllowlistResponse | null>(null);
  const [testers, setTesters] = useState<PortalTesterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [canManageTeamAccess, setCanManageTeamAccess] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      sub: { ...t.caption, marginBottom: spacing.md, lineHeight: 20 },
      section: { ...t.label, color: c.primaryDark, marginTop: spacing.lg, marginBottom: spacing.sm },
      rowText: { ...t.body, flex: 1, marginRight: spacing.sm },
      meta: { ...t.caption, marginTop: spacing.xs },
      err: { ...t.body, color: c.danger, marginBottom: spacing.md },
      rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
      countEm: { fontWeight: '600', fontFamily: f.semibold },
    });
  }, [c, f]);

  const refresh = useCallback(async () => {
    const [a, t] = await Promise.all([api.portalValuedTesterAllowlist(), api.portalTesters()]);
    setAllow(a);
    setTesters(t.testers);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        setErr(null);
        try {
          const me = await api.portalMe();
          const [a, t] = await Promise.all([api.portalValuedTesterAllowlist(), api.portalTesters()]);
          if (cancelled) return;
          setCanManageTeamAccess(me.canManageTeamAccess);
          setAllow(a);
          setTesters(t.testers);
        } catch (e) {
          if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      try {
        await refresh();
      } finally {
        setRefreshing(false);
      }
    })();
  }, [refresh]);

  const add = async () => {
    const v = emailSchema.safeParse(addEmail.trim());
    if (!v.success) {
      Alert.alert('Email', v.error.issues[0]?.message ?? 'Invalid email');
      return;
    }
    setBusy(true);
    try {
      await api.portalValuedTesterAllowlistPatch({ add: v.data });
      setAddEmail('');
      await refresh();
    } catch (e) {
      Alert.alert('Allowlist', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const doRemove = async (email: string) => {
    setBusy(true);
    try {
      await api.portalValuedTesterAllowlistPatch({ remove: email });
      await refresh();
    } catch (e) {
      Alert.alert('Allowlist', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const removeEmail = (email: string) => {
    Alert.alert(
      'Remove from portal allowlist?',
      `${email} will not be able to newly register as a valued tester unless this email is re-added or listed in STAFF_VALUED_TESTER_EMAILS on the server.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void doRemove(email) },
      ],
    );
  };

  const doRevoke = async (userId: string) => {
    setBusy(true);
    try {
      await api.portalTesterRevoke(userId);
      await refresh();
    } catch (e) {
      Alert.alert('Revoke', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const revoke = (row: PortalTesterRow) => {
    Alert.alert(
      'Revoke valued tester access?',
      `${row.email} becomes a family account and loses tester perks. Their email stays on the allowlist unless you remove it separately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => void doRevoke(row.id) },
      ],
    );
  };

  async function doClearPortalAllowlist() {
    setBusy(true);
    try {
      await api.portalValuedTesterAllowlistClearDatabase();
      await refresh();
    } catch (e) {
      Alert.alert('Clear allowlist', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const clearPortalAllowlist = () => {
    Alert.alert(
      'Clear entire portal allowlist?',
      'Removes every email saved in the portal database. STAFF_VALUED_TESTER_EMAILS on the server is unchanged. Existing valued tester accounts are not removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => void doClearPortalAllowlist() },
      ],
    );
  };

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  if (err) {
    return (
      <Screen scroll>
        <Text style={styles.err}>{err}</Text>
      </Screen>
    );
  }

  const slotsLeft = allow ? Math.max(0, allow.valuedTesterMax - allow.activeTesterCount) : 0;

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
      <Text style={styles.sub}>
        Valued testers register via &quot;Staff or tester signup&quot;. Cap: {allow?.valuedTesterMax ?? '—'} active accounts. When an env or
        portal allowlist is non-empty, only listed emails may register. Admins always have full portal access regardless of team toggles.
      </Text>

      <Card>
        <Text style={styles.rowText}>
          Active tester accounts: <Text style={styles.countEm}>{allow?.activeTesterCount ?? 0}</Text> /{' '}
          {allow?.valuedTesterMax ?? '—'}
        </Text>
        <Text style={styles.meta}>Open slots: {slotsLeft}</Text>
        <Text style={styles.meta}>
          Allowlist gating: {allow?.requiresAllowlist ? 'on (env and/or portal list)' : 'off (any email until cap)'}
        </Text>
        {allow?.envAllowlistConfigured ? (
          <Text style={styles.meta}>
            Server env: {allow.envAllowlistCount} email(s) in STAFF_VALUED_TESTER_EMAILS (not editable in-app).
          </Text>
        ) : null}
      </Card>

      <Text style={styles.section}>Portal allowlist (database)</Text>
      <TextField
        label="Add email"
        value={addEmail}
        onChangeText={setAddEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button title={busy ? 'Working…' : 'Add to allowlist'} onPress={() => void add()} disabled={busy} />

      {allow?.databaseEmails.length === 0 ? (
        <Text style={[styles.meta, { marginTop: spacing.sm }]}>No emails stored in the portal list yet.</Text>
      ) : (
        allow?.databaseEmails.map((em) => (
          <Card key={em}>
            <Text style={styles.rowText}>{em}</Text>
            <View style={styles.rowActions}>
              <Button title="Remove" variant="secondary" size="sm" onPress={() => removeEmail(em)} disabled={busy} />
            </View>
          </Card>
        ))
      )}

      {canManageTeamAccess ? (
        <Card>
          <Text style={styles.meta}>Admin: clear all portal-stored allowlist emails (does not change env or live accounts).</Text>
          <Button
            title={busy ? 'Working…' : 'Clear portal allowlist'}
            variant="secondary"
            onPress={clearPortalAllowlist}
            disabled={busy}
          />
        </Card>
      ) : null}

      <Text style={styles.section}>Active valued tester accounts</Text>
      {testers.length === 0 ? (
        <Text style={styles.meta}>None yet.</Text>
      ) : (
        testers.map((t) => (
          <Card key={t.id}>
            <Text style={styles.rowText}>{t.email}</Text>
            <Text style={styles.meta}>
              User ID: {t.id}
              {'\n'}
              Access until: {t.valuedTesterAccessUntil ? new Date(t.valuedTesterAccessUntil).toLocaleDateString() : '—'}
              {'\n'}
              Profile published: {t.profilePublished ? 'yes' : 'no'}
            </Text>
            <View style={styles.rowActions}>
              <Button title="Revoke access" variant="secondary" size="sm" onPress={() => revoke(t)} disabled={busy} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

function UserSupportSection() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { id: string; email: string; role: string; profilePublished: boolean; subscriptionStatus: string }[]
  >([]);
  const [searched, setSearched] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      sub: { ...t.caption, marginBottom: spacing.md, lineHeight: 20 },
      rowText: { ...t.body, fontWeight: '600', marginBottom: spacing.xs },
      meta: { ...t.caption, lineHeight: 20 },
      err: { ...t.body, color: c.danger, marginTop: spacing.md },
      mono: { ...t.caption, fontFamily: 'monospace' },
    });
  }, [c, f]);

  const search = useCallback(async () => {
    const t = q.trim();
    if (t.length < 3) {
      setErr('Enter at least 3 characters.');
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setErr(null);
    setSearched(true);
    try {
      const { results: r } = await api.portalUserSupportSearch(t);
      setResults(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Search failed.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  return (
    <Screen scroll>
      <Text style={styles.sub}>
        Search user accounts by email fragment (partial match, case-insensitive). Returns up to 10 rows with id, role, subscription, and
        publish state. Use for support tickets and fraud review. Searches are audited server-side.
      </Text>
      <TextField label="Email contains" value={q} onChangeText={setQ} keyboardType="email-address" autoCapitalize="none" />
      <Button title={loading ? 'Searching…' : 'Search'} onPress={() => void search()} loading={loading} disabled={!q.trim()} />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {searched && !err && results.length === 0 ? (
        <Text style={[styles.meta, { marginTop: spacing.lg }]}>No matches.</Text>
      ) : null}
      {results.map((r) => (
        <Card key={r.id}>
          <Text style={styles.rowText}>{r.email}</Text>
          <Text style={styles.meta}>Role: {r.role}</Text>
          <Text style={styles.meta}>Subscription: {r.subscriptionStatus}</Text>
          <Text style={styles.meta}>Profile published: {r.profilePublished ? 'yes' : 'no'}</Text>
          <Text style={styles.mono}>ObjectId: {r.id}</Text>
        </Card>
      ))}
    </Screen>
  );
}

function AnnouncementsSection() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [list, setList] = useState<PortalAnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      sub: { ...t.caption, marginBottom: spacing.md, lineHeight: 20 },
      annTitle: { ...t.sectionTitle, fontSize: 17, marginBottom: spacing.xs },
      annBody: { ...t.body, color: c.textSecondary, lineHeight: 22 },
      annMeta: { ...t.caption, marginTop: spacing.sm },
      err: { color: c.danger, marginBottom: spacing.md },
    });
  }, [c, f]);

  const load = useCallback(async () => {
    const [me, { announcements }] = await Promise.all([api.portalMe(), api.portalAnnouncements()]);
    setIsAdmin(me.canManageTeamAccess === true);
    setList(announcements);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        setErr(null);
        try {
          await load();
        } catch (e) {
          if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      try {
        setErr(null);
        await load();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed');
      } finally {
        setRefreshing(false);
      }
    })();
  }, [load]);

  const post = async () => {
    const t = title.trim();
    const b = body.trim();
    if (t.length < 1 || b.length < 1) {
      Alert.alert('Announcements', 'Title and body are required.');
      return;
    }
    setBusy(true);
    try {
      await api.portalAnnouncementCreate(t, b);
      setTitle('');
      setBody('');
      await load();
      Alert.alert('Posted', 'Staff announcement is visible to everyone with this section enabled.');
    } catch (e) {
      Alert.alert('Announcements', e instanceof Error ? e.message : 'Failed (admin only).');
    } finally {
      setBusy(false);
    }
  };

  const remove = (row: PortalAnnouncementRow) => {
    Alert.alert('Delete announcement?', row.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await api.portalAnnouncementDelete(row.id);
              await load();
            } catch (e) {
              Alert.alert('Delete', e instanceof Error ? e.message : 'Failed');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
      <Text style={styles.sub}>
        Internal staff feed (newest first). Team members can read; only the admin account can post or delete. Use for launch notes, policy
        reminders, and on-call information.
      </Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}

      {isAdmin ? (
        <Card>
          <Text style={styles.annTitle}>New announcement</Text>
          <TextField label="Title" value={title} onChangeText={setTitle} />
          <TextField label="Body" value={body} onChangeText={setBody} multiline />
          <Button title={busy ? 'Posting…' : 'Post announcement'} onPress={() => void post()} disabled={busy} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.annBody}>Only the admin account can create or delete announcements.</Text>
        </Card>
      )}

      <Text style={[styles.annTitle, { marginTop: spacing.lg }]}>Recent</Text>
      {list.length === 0 ? (
        <Text style={styles.annBody}>No announcements yet.</Text>
      ) : (
        list.map((a) => (
          <Card key={a.id}>
            <Text style={styles.annTitle}>{a.title}</Text>
            <Text style={styles.annBody}>{a.body}</Text>
            <Text style={styles.annMeta}>
              {new Date(a.createdAt).toLocaleString()}
              {a.createdByEmail ? ` · ${a.createdByEmail}` : ''}
            </Text>
            {isAdmin ? (
              <View style={{ marginTop: spacing.sm }}>
                <Button title="Delete" variant="secondary" size="sm" onPress={() => remove(a)} disabled={busy} />
              </View>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  const { colors: c } = useCarePairUi();
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: ok ? c.success : c.danger,
        marginRight: spacing.sm,
      }}
    />
  );
}

export default function StaffPortalSectionScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  useSectionTitle(id);

  const { colors: c, fonts: f } = useCarePairUi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [dash, setDash] = useState<{ headline: string; metrics: { label: string; value: number }[] } | null>(null);
  const [entries, setEntries] = useState<PortalActivityLogEntry[]>([]);
  const [health, setHealth] = useState<PortalSystemHealthResponse | null>(null);
  const [revenue, setRevenue] = useState<PortalRevenueSummary | null>(null);
  const [payouts, setPayouts] = useState<{ headline: string; message: string; items: unknown[] } | null>(null);
  const [reports, setReports] = useState<{ headline: string; rows: { role: string; count: number }[] } | null>(null);
  const [settings, setSettings] = useState<{ headline: string; notes: string[]; valuedTesterMax: number } | null>(null);
  const [roadmap, setRoadmap] = useState<{ status: string; title: string; detail: string }[]>([]);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      headline: { ...t.screenTitle, marginBottom: spacing.sm },
      body: { ...t.body, color: c.textSecondary, lineHeight: 22 },
      metricLabel: { ...t.body, flex: 1 },
      metricValue: { ...t.sectionTitle, fontSize: 20, color: c.primaryDark },
      err: { ...t.body, color: c.danger },
      logAction: { ...t.body, fontWeight: '600', marginTop: spacing.xs },
      logDetail: { ...t.caption, marginTop: spacing.xs },
      healthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
      badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.sm,
        backgroundColor: c.primaryMuted,
        marginBottom: spacing.xs,
      },
      badgeText: { fontSize: 12, fontWeight: '600', color: c.primaryDark, fontFamily: f.semibold },
    });
  }, [c, f]);

  const loadStandard = useCallback(async () => {
    if (!id || id === 'user_support' || id === 'testers' || id === 'announcements') return;
    setLoading(true);
    setError(null);
    try {
      if (id === 'dashboard') {
        setDash(await api.portalDashboardSummary());
      } else if (id === 'activity_log') {
        const { entries: e } = await api.portalActivityLog(50);
        setEntries(e);
      } else if (id === 'system_health') {
        setHealth(await api.portalSystemHealth());
      } else if (id === 'revenue') {
        setRevenue(await api.portalRevenueSummary());
      } else if (id === 'payouts') {
        setPayouts(await api.portalPayoutsSummary());
      } else if (id === 'reports') {
        setReports(await api.portalReportsSummary());
      } else if (id === 'settings') {
        setSettings(await api.portalSettingsSummary());
      } else if (id === 'roadmap') {
        const { items } = await api.portalRoadmap();
        setRoadmap(items);
      } else {
        setError(`Unknown section: ${id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this section.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadStandard();
    }, [loadStandard]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      await loadStandard();
      setRefreshing(false);
    })();
  }, [loadStandard]);

  if (id === 'user_support') return <UserSupportSection />;
  if (id === 'testers') return <TestersSection />;
  if (id === 'announcements') return <AnnouncementsSection />;

  if (loading) {
    return (
      <Screen scroll>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={styles.err}>{error}</Text>
      </Screen>
    );
  }

  if (id === 'dashboard' && dash) {
    return (
      <Screen
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={styles.headline}>{dash.headline}</Text>
        <Text style={[styles.body, { marginBottom: layout.sectionGap }]}>
          Snapshot of registered users and published family/caregiver profiles. Pull to refresh after bulk changes or imports.
        </Text>
        {dash.metrics.map((m) => (
          <Card key={m.label}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
          </Card>
        ))}
      </Screen>
    );
  }

  if (id === 'activity_log') {
    return (
      <Screen
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={[styles.body, { marginBottom: spacing.md }]}>
          Immutable audit log (team ACL changes, announcement actions, support searches). Newest first.
        </Text>
        {entries.length === 0 ? (
          <EmptyState
            title="No audit entries yet"
            description="Team ACL changes, announcements, and support searches will show here when they occur."
          />
        ) : (
          entries.map((e) => (
            <Card key={e.id}>
              <Text style={styles.body}>{new Date(e.createdAt).toLocaleString()}</Text>
              <Text style={styles.body}>{e.actorEmail || 'unknown actor'}</Text>
              <Text style={styles.logAction}>{e.action}</Text>
              {e.detail?.changes && typeof e.detail.changes === 'object' ? (
                <Text style={styles.logDetail}>
                  {Object.entries(e.detail.changes as Record<string, { from: boolean; to: boolean }>)
                    .map(([k, v]) => `${k}: ${String(v.from)} → ${String(v.to)}`)
                    .join('\n')}
                </Text>
              ) : null}
            </Card>
          ))
        )}
      </Screen>
    );
  }

  if (id === 'system_health' && health) {
    return (
      <Screen
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={[styles.body, { marginBottom: spacing.md }]}>Live API and database ping for on-call checks.</Text>
        <Card>
          <View style={styles.healthRow}>
            <StatusDot ok={health.ok} />
            <Text style={styles.body}>API process: running</Text>
          </View>
          <View style={styles.healthRow}>
            <StatusDot ok={health.database === 'ok'} />
            <Text style={styles.body}>MongoDB: {health.database}</Text>
          </View>
          <Text style={styles.body}>Node environment: {health.nodeEnv}</Text>
          <Text style={[styles.body, { marginTop: spacing.sm }]}>Server time (UTC): {health.serverTime}</Text>
        </Card>
      </Screen>
    );
  }

  if (id === 'revenue' && revenue) {
    return (
      <Screen
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={styles.headline}>{revenue.headline}</Text>
        {!revenue.stripeConfigured ? (
          <Card>
            {(revenue.lines ?? []).map((line, i) => (
              <Text key={i} style={[styles.body, { marginBottom: spacing.xs }]}>
                {line}
              </Text>
            ))}
          </Card>
        ) : revenue.available != null ? (
          <Card>
            <Text style={styles.body}>Available: {revenue.available}</Text>
            <Text style={[styles.body, { marginTop: spacing.sm }]}>Pending: {revenue.pending ?? '—'}</Text>
          </Card>
        ) : (
          <Card>
            {(revenue.lines ?? []).map((line, i) => (
              <Text key={i} style={[styles.body, { marginBottom: spacing.xs }]}>
                {line}
              </Text>
            ))}
          </Card>
        )}
      </Screen>
    );
  }

  if (id === 'payouts' && payouts) {
    return (
      <Screen
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={styles.headline}>{payouts.headline}</Text>
        <Text style={[styles.body, { marginBottom: spacing.md }]}>{payouts.message}</Text>
        {payouts.items.length === 0 ? (
          <Card>
            <Text style={styles.body}>No payout queue items in the API yet. Use Stripe Dashboard for manual payouts until automation ships.</Text>
          </Card>
        ) : null}
      </Screen>
    );
  }

  if (id === 'reports' && reports) {
    return (
      <Screen
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={styles.headline}>{reports.headline}</Text>
        <Text style={[styles.body, { marginBottom: spacing.md }]}>Live counts from the users collection by role.</Text>
        {reports.rows.map((row) => (
          <Card key={row.role}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>{row.role}</Text>
              <Text style={styles.metricValue}>{row.count}</Text>
            </View>
          </Card>
        ))}
      </Screen>
    );
  }

  if (id === 'settings' && settings) {
    return (
      <Screen
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={styles.headline}>{settings.headline}</Text>
        <Card>
          <Text style={styles.metricLabel}>Valued tester cap (VALUED_TESTER_MAX)</Text>
          <Text style={styles.metricValue}>{settings.valuedTesterMax}</Text>
        </Card>
        {settings.notes.map((note, i) => (
          <Card key={i}>
            <Text style={styles.body}>{note}</Text>
          </Card>
        ))}
      </Screen>
    );
  }

  if (id === 'roadmap') {
    return (
      <Screen
        scroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
    >
        <Text style={[styles.body, { marginBottom: spacing.md }]}>
          Internal product roadmap copy — not a public changelog. Aligns with server constants.
        </Text>
        {roadmap.map((it, i) => (
          <Card key={i}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{it.status}</Text>
            </View>
            <Text style={styles.headline}>{it.title}</Text>
            <Text style={styles.body}>{it.detail}</Text>
          </Card>
        ))}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.body}>This section is not available.</Text>
    </Screen>
  );
}
