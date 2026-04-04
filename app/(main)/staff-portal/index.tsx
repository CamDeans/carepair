import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function StaffPortalHomeScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<api.PortalMeResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

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
      adminText: { ...t.sub, color: c.text, fontWeight: '600', fontFamily: f.semibold },
    });
  }, [c, f]);

  const load = useCallback((opts?: { silent?: boolean }) => {
    let cancelled = false;
    (async () => {
      if (!opts?.silent) setLoading(true);
      try {
        const pm = await api.portalMe();
        if (!cancelled) {
          setData(pm);
          setLoadFailed(false);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ silent: true });
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  if (loadFailed) {
    return (
      <Screen scroll>
        <EmptyState
          title="Could not load staff portal"
          description="Check your connection and that the server has the portal enabled, then try again."
          primaryAction={{ title: 'Retry', onPress: () => load() }}
        />
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
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }>
      <Text style={styles.h1}>Staff portal</Text>
      <Text style={styles.sub}>
        Signed in as {data.staffRole}. Open a section below. Team members only see what the admin enables.
      </Text>
      {data.canManageTeamAccess ? (
        <Pressable
          style={styles.adminRow}
          accessibilityRole="button"
          accessibilityLabel="Manage team member access"
          onPress={() => router.push('/staff-portal/team-access' as Href)}>
          <Text style={styles.adminText}>Manage team member access ›</Text>
        </Pressable>
      ) : null}
      {entries.map((sid) => (
        <Pressable
          key={sid}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={data.sectionLabels![sid] ?? sid}
          onPress={() => router.push(`/staff-portal/section/${sid}` as Href)}>
          <Text style={styles.rowText}>{data.sectionLabels![sid] ?? sid}</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}

      <View style={[styles.adminRow, { marginTop: spacing.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}>
        <Text style={[styles.adminText, { color: c.text, fontWeight: '400', fontFamily: f.regular }]}>
          Usage: Dashboard and reports are read-only snapshots. Valued testers and User lookup are for account operations. Announcements are
          internal-only; only the admin account can post or delete. Team visibility is controlled under Manage team member access. Pull down on
          any section to refresh. If PORTAL_ENABLED=0 on the server, routes return errors — keep it on in production when staff use the app.
        </Text>
      </View>
    </Screen>
  );
}
