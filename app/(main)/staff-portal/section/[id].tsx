import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import type { PortalActivityLogEntry, PortalTesterRow } from '@/src/lib/serverApi';
import * as api from '@/src/lib/serverApi';
import { emailSchema } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { radius, spacing } from '@/src/theme/tokens';

function formatActivityLog(entries: PortalActivityLogEntry[]): string {
  if (entries.length === 0) return 'No entries yet.';
  return entries
    .map((e) => {
      const t = new Date(e.createdAt).toLocaleString();
      let block = `${t} · ${e.actorEmail || 'unknown'}\n${e.action}`;
      const ch = e.detail?.changes;
      if (ch && typeof ch === 'object') {
        const lines = Object.entries(ch).map(([k, v]) => `  ${k}: ${String(v.from)} → ${String(v.to)}`);
        block += `\n${lines.join('\n')}`;
      }
      return block;
    })
    .join('\n\n');
}

function TestersSection() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [allow, setAllow] = useState<api.PortalValuedTesterAllowlistResponse | null>(null);
  const [testers, setTesters] = useState<PortalTesterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [canManageTeamAccess, setCanManageTeamAccess] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      sub: { ...t.caption, marginBottom: spacing.md, lineHeight: 20 },
      section: { ...t.label, color: c.primaryDark, marginTop: spacing.lg, marginBottom: spacing.sm },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
        marginBottom: spacing.sm,
      },
      rowText: { ...t.body, flex: 1, marginRight: spacing.sm },
      meta: { ...t.caption, marginBottom: spacing.md },
      err: { ...t.body, color: c.danger, marginBottom: spacing.md },
      linkHint: { ...t.caption, fontStyle: 'italic', marginTop: spacing.sm },
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
      <Screen scroll>
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
    <Screen scroll>
      <Text style={styles.sub}>
        Valued testers sign up with the &quot;Staff or tester&quot; path. Registration is limited to{' '}
        {allow?.valuedTesterMax ?? '—'} active accounts. When the portal or server env allowlist has at least one
        email, only those addresses may register (same pattern as admin/team staff emails). Admin accounts always have
        full staff portal access regardless of team section toggles.
      </Text>
      <Text style={styles.meta}>
        Active accounts: {allow?.activeTesterCount ?? 0} / {allow?.valuedTesterMax ?? '—'} · slots open: {slotsLeft}
      </Text>
      {allow?.envAllowlistConfigured ? (
        <Text style={styles.meta}>
          Server env lists {allow.envAllowlistCount} email(s) (STAFF_VALUED_TESTER_EMAILS) — not editable here.
        </Text>
      ) : null}
      <Text style={styles.meta}>
        Allowlist gating: {allow?.requiresAllowlist ? 'on (env and/or portal list)' : 'off (any email until cap)'}
      </Text>

      <Text style={styles.section}>Portal allowlist</Text>
      <TextField
        label="Add email"
        value={addEmail}
        onChangeText={setAddEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button title={busy ? 'Working…' : 'Add to allowlist'} onPress={() => void add()} disabled={busy} />
      {allow?.databaseEmails.length === 0 ? (
        <Text style={[styles.meta, { marginTop: spacing.sm }]}>No emails in the portal list yet.</Text>
      ) : (
        allow?.databaseEmails.map((em) => (
          <View key={em} style={styles.row}>
            <Text style={styles.rowText}>{em}</Text>
            <Button title="Remove" variant="secondary" onPress={() => removeEmail(em)} disabled={busy} />
          </View>
        ))
      )}
      {canManageTeamAccess ? (
        <>
          <Text style={[styles.meta, { marginTop: spacing.md }]}>
            Admin override: clear every portal-stored email at once (does not change env or existing accounts).
          </Text>
          <Button
            title={busy ? 'Working…' : 'Clear portal allowlist (admin)'}
            variant="secondary"
            onPress={clearPortalAllowlist}
            disabled={busy}
          />
        </>
      ) : null}

      <Text style={styles.section}>Active valued tester accounts</Text>
      {testers.length === 0 ? (
        <Text style={styles.meta}>None yet.</Text>
      ) : (
        testers.map((t) => (
          <View key={t.id} style={styles.row}>
            <Text style={styles.rowText}>
              {t.email}
              {'\n'}
              <Text style={styles.meta}>
                Access until:{' '}
                {t.valuedTesterAccessUntil ? new Date(t.valuedTesterAccessUntil).toLocaleDateString() : '—'}
              </Text>
            </Text>
            <Button title="Revoke" variant="secondary" onPress={() => revoke(t)} disabled={busy} />
          </View>
        ))
      )}
    </Screen>
  );
}

function UserSupportSection() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sub: { fontSize: 14, color: c.textSecondary, marginBottom: spacing.md, fontFamily: f.regular },
        body: { fontSize: 15, color: c.textSecondary, lineHeight: 22, fontFamily: f.regular },
        err: { fontSize: 15, color: c.danger, marginTop: spacing.md, fontFamily: f.regular },
      }),
    [c, f],
  );

  const search = useCallback(async () => {
    const t = q.trim();
    if (t.length < 3) {
      setErr('Enter at least 3 characters.');
      setBody(null);
      return;
    }
    setLoading(true);
    setErr(null);
    setBody(null);
    try {
      const { results } = await api.portalUserSupportSearch(t);
      if (results.length === 0) setBody('No matches.');
      else {
        setBody(
          results
            .map(
              (r) =>
                `${r.email}\n  role: ${r.role} · subscription: ${r.subscriptionStatus} · profile published: ${r.profilePublished ? 'yes' : 'no'}`,
            )
            .join('\n\n'),
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }, [q]);

  return (
    <Screen scroll>
      <Text style={styles.sub}>
        Search by email (partial match). Returns up to 10 accounts — limited fields only. Misuse violates internal
        policy.
      </Text>
      <TextField label="Email contains" value={q} onChangeText={setQ} keyboardType="email-address" autoCapitalize="none" />
      <Button title={loading ? 'Searching…' : 'Search'} onPress={() => void search()} loading={loading} disabled={!q.trim()} />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {body ? <Text style={[styles.body, { marginTop: spacing.lg }]}>{body}</Text> : null}
    </Screen>
  );
}

export default function StaffPortalSectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c, fonts: f } = useCarePairUi();
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: { fontSize: 15, color: c.textSecondary, lineHeight: 22, fontFamily: f.regular },
        err: { fontSize: 15, color: c.danger, fontFamily: f.regular },
      }),
    [c, f],
  );

  useEffect(() => {
    if (!id || id === 'user_support' || id === 'testers') {
      setLoading(false);
      setBody(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setBody(null);
      try {
        if (id === 'dashboard') {
          const d = await api.portalDashboardSummary();
          if (!cancelled) {
            setBody(`${d.headline}\n\n${d.metrics.map((m) => `${m.label}: ${m.value}`).join('\n')}`);
          }
        } else if (id === 'activity_log') {
          const { entries } = await api.portalActivityLog(50);
          if (!cancelled) setBody(formatActivityLog(entries));
        } else if (id === 'system_health') {
          const h = await api.portalSystemHealth();
          if (!cancelled) {
            setBody(
              `API reachable\nDatabase: ${h.database}\nHealthy: ${h.ok ? 'yes' : 'no'}\nNode: ${h.nodeEnv}\nServer time: ${h.serverTime}`,
            );
          }
        } else if (id === 'revenue') {
          const r = await api.portalRevenueSummary();
          if (!cancelled) {
            if (!r.stripeConfigured) {
              setBody(`${r.headline}\n\n${(r.lines ?? []).join('\n')}`);
            } else if (r.available != null) {
              setBody(`${r.headline}\n\nAvailable: ${r.available}\nPending: ${r.pending ?? '—'}`);
            } else {
              setBody(`${r.headline}\n\n${(r.lines ?? []).join('\n')}`);
            }
          }
        } else if (id === 'payouts') {
          const p = await api.portalPayoutsSummary();
          if (!cancelled) setBody(`${p.headline}\n\n${p.message}`);
        } else if (id === 'reports') {
          const r = await api.portalReportsSummary();
          if (!cancelled) {
            setBody(
              `${r.headline}\n\n${r.rows.map((row) => `${row.role}: ${row.count}`).join('\n')}`,
            );
          }
        } else if (id === 'settings') {
          const s = await api.portalSettingsSummary();
          if (!cancelled) {
            setBody(`${s.headline}\n\n${s.notes.join('\n')}\n\nValued tester cap: ${s.valuedTesterMax}`);
          }
        } else if (id === 'roadmap') {
          const { items } = await api.portalRoadmap();
          if (!cancelled) {
            setBody(
              items.map((it) => `[${it.status}] ${it.title}\n${it.detail}`).join('\n\n'),
            );
          }
        } else if (id === 'announcements') {
          const { announcements } = await api.portalAnnouncements();
          if (!cancelled) {
            if (announcements.length === 0) setBody('No announcements yet. Admins can create them via POST /api/portal/announcements.');
            else {
              setBody(
                announcements
                  .map((a) => {
                    const when = new Date(a.createdAt).toLocaleString();
                    return `${a.title} (${when}${a.createdByEmail ? ` · ${a.createdByEmail}` : ''})\n${a.body}`;
                  })
                  .join('\n\n—\n\n'),
              );
            }
          }
        } else {
          if (!cancelled) setBody(`Unknown section: ${id}`);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this section.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (id === 'user_support') {
    return <UserSupportSection />;
  }

  if (id === 'testers') {
    return <TestersSection />;
  }

  if (loading) {
    return (
      <Screen scroll>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll>
        <Text style={styles.err}>{error}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.body}>{body}</Text>
    </Screen>
  );
}
