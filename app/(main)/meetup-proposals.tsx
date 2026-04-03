import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import type { MeetupProposalRow } from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

function Row({ item, label }: { item: MeetupProposalRow; label: string }) {
  const { colors: c, fonts: f } = useCarePairUi();
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
    });
  }, [c, f]);

  return (
    <View style={styles.card}>
      <Text style={styles.meta}>
        {label} · {item.peerName}
      </Text>
      <Text style={styles.when}>{item.when}</Text>
      <Text style={styles.where}>{item.where}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>
    </View>
  );
}

export default function MeetupProposalsScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [incoming, setIncoming] = useState<MeetupProposalRow[]>([]);
  const [outgoing, setOutgoing] = useState<MeetupProposalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, marginBottom: spacing.sm },
      sub: { ...t.sub, marginBottom: layout.sectionGap - spacing.sm },
      section: { ...t.label, color: c.primaryDark, marginTop: spacing.lg, marginBottom: spacing.sm },
      empty: { ...t.bodySecondary },
    });
  }, [c, f]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        setLoading(true);
        try {
          const r = await api.meetupProposalsList();
          if (!cancelled) {
            setIncoming(r.incoming);
            setOutgoing(r.outgoing);
          }
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
    }, []),
  );

  return (
    <Screen scroll>
      <Text style={styles.h1}>Meet-up proposals</Text>
      <Text style={styles.sub}>
        Proposals you send or receive are stored here after you match. The other person gets a push notification when you send one.
      </Text>
      {loading ? <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.md }} /> : null}
      <Text style={styles.section}>Received</Text>
      {!loading && incoming.length === 0 ? <Text style={styles.empty}>None yet.</Text> : null}
      {incoming.map((item) => (
        <Row key={item.id} item={item} label="From" />
      ))}
      <Text style={styles.section}>Sent</Text>
      {!loading && outgoing.length === 0 ? <Text style={styles.empty}>None yet.</Text> : null}
      {outgoing.map((item) => (
        <Row key={item.id} item={item} label="To" />
      ))}
    </Screen>
  );
}
