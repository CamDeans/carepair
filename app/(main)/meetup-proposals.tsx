import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import type { MeetupProposalRow } from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

function ProposalCard({
  item,
  label,
  variant,
  onUpdated,
}: {
  item: MeetupProposalRow;
  label: string;
  variant: 'incoming' | 'outgoing';
  onUpdated: () => void;
}) {
  const { colors: c, fonts: f } = useCarePairUi();
  const [busy, setBusy] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      card: {
        padding: spacing.md,
        marginBottom: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      },
      meta: { ...t.caption, marginBottom: spacing.xs },
      when: { ...t.body, fontWeight: '600', fontFamily: f.semibold },
      where: { ...t.body, marginTop: spacing.xs },
      status: { ...t.caption, marginTop: spacing.sm, color: c.primaryDark },
      actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
      act: { flexGrow: 1, minWidth: 120 },
    });
  }, [c, f]);

  const pending = item.status === 'pending';

  const run = async (status: 'accepted' | 'declined' | 'cancelled') => {
    setBusy(true);
    try {
      await api.meetupProposalPatch(item.id, status);
      onUpdated();
    } catch (e) {
      Alert.alert('Meet-up', e instanceof Error ? e.message : 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.meta}>
        {label} · {item.peerName}
      </Text>
      <Text style={styles.when}>{item.when}</Text>
      <Text style={styles.where}>{item.where}</Text>
      <Text style={styles.status}>
        Status: {item.status === 'cancelled' ? 'withdrawn' : item.status.replace(/_/g, ' ')}
      </Text>
      {pending ? (
        <View style={styles.actions}>
          {variant === 'incoming' ? (
            <>
              <View style={styles.act}>
                <Button title="Accept" onPress={() => void run('accepted')} loading={busy} disabled={busy} />
              </View>
              <View style={styles.act}>
                <Button title="Decline" variant="secondary" onPress={() => void run('declined')} disabled={busy} />
              </View>
            </>
          ) : (
            <View style={styles.act}>
              <Button title="Withdraw proposal" variant="secondary" onPress={() => void run('cancelled')} disabled={busy} />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function MeetupProposalsScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [incoming, setIncoming] = useState<MeetupProposalRow[]>([]);
  const [outgoing, setOutgoing] = useState<MeetupProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, marginBottom: spacing.sm },
      sub: { ...t.sub, marginBottom: layout.sectionGap - spacing.sm },
      section: { ...t.label, color: c.primaryDark, marginTop: spacing.lg, marginBottom: spacing.sm },
      empty: { ...t.bodySecondary },
    });
  }, [c, f]);

  const load = useCallback(async () => {
    const r = await api.meetupProposalsList();
    setIncoming(r.incoming);
    setOutgoing(r.outgoing);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        setLoading(true);
        try {
          await load();
        } catch {
          if (!cancelled) {
            setIncoming([]);
            setOutgoing([]);
          }
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
    void (async () => {
      setRefreshing(true);
      try {
        await load();
      } catch {
        /* ignore */
      } finally {
        setRefreshing(false);
      }
    })();
  }, [load]);

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
      <Text style={styles.h1}>Meet-up proposals</Text>
      <Text style={styles.sub}>
        Accept or decline invites you receive. Withdraw a proposal you sent if plans change. The other person is notified.
      </Text>
      {loading ? <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} /> : null}
      <Text style={styles.section}>Received</Text>
      {!loading && incoming.length === 0 ? <Text style={styles.empty}>None yet.</Text> : null}
      {incoming.map((item) => (
        <ProposalCard
          key={item.id}
          item={item}
          label="From"
          variant="incoming"
          onUpdated={() => void load()}
        />
      ))}
      <Text style={styles.section}>Sent</Text>
      {!loading && outgoing.length === 0 ? <Text style={styles.empty}>None yet.</Text> : null}
      {outgoing.map((item) => (
        <ProposalCard
          key={item.id}
          item={item}
          label="To"
          variant="outgoing"
          onUpdated={() => void load()}
        />
      ))}
    </Screen>
  );
}
