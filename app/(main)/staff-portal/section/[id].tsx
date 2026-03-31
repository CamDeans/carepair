import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import type { PortalActivityLogEntry } from '@/src/lib/serverApi';
import * as api from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

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
    if (!id || id === 'user_support') {
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
        } else if (id === 'testers') {
          const { testers } = await api.portalTesters();
          if (!cancelled) {
            if (testers.length === 0) setBody('No valued tester accounts.');
            else {
              setBody(
                testers
                  .map((t) => {
                    const until = t.valuedTesterAccessUntil
                      ? new Date(t.valuedTesterAccessUntil).toLocaleDateString()
                      : '—';
                    return `${t.email}\n  Access until: ${until}\n  Profile published: ${t.profilePublished ? 'yes' : 'no'}`;
                  })
                  .join('\n\n'),
              );
            }
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
