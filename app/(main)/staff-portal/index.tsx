import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function StaffPortalHomeScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<api.PortalMeResponse | null>(null);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.sm },
      sub: { ...t.caption, marginBottom: spacing.lg },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: layout.listRowMinHeight,
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      },
      rowText: { ...t.body },
      chev: { fontSize: 20, color: c.textSubtle, fontWeight: '300' },
      adminRow: {
        marginTop: spacing.md,
        padding: spacing.lg,
        backgroundColor: c.primaryMuted,
        borderRadius: radius.lg,
      },
      adminText: { ...t.sub, color: c.primaryDark, fontWeight: '600', fontFamily: f.semibold },
    });
  }, [c, f]);

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const pm = await api.portalMe();
        if (!cancelled) setData(pm);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  if (!data?.canOpenStaffPortal || !data.sections || !data.sectionLabels) {
    return (
      <Screen scroll>
        <Text style={styles.sub}>This account does not have staff portal access.</Text>
      </Screen>
    );
  }

  const entries = (Object.keys(data.sections) as string[]).filter((k) => data.sections![k]);

  return (
    <Screen scroll>
      <Text style={styles.h1}>Staff portal</Text>
      <Text style={styles.sub}>
        Signed in as {data.staffRole}. Open a section below. Team members only see what the admin enables.
      </Text>
      {data.canManageTeamAccess ? (
        <Pressable style={styles.adminRow} onPress={() => router.push('/staff-portal/team-access' as Href)}>
          <Text style={styles.adminText}>Manage team member access ›</Text>
        </Pressable>
      ) : null}
      {entries.map((id) => (
        <Pressable
          key={id}
          style={styles.row}
          onPress={() => router.push(`/staff-portal/section/${id}` as Href)}>
          <Text style={styles.rowText}>{data.sectionLabels![id] ?? id}</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
