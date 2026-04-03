import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import * as api from '@/src/lib/serverApi';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

function savedCaption(ta: { updatedAt?: string; updatedByEmail?: string | null }): string | null {
  if (!ta.updatedAt) return null;
  const d = new Date(ta.updatedAt);
  if (Number.isNaN(d.getTime())) return null;
  const when = d.toLocaleString();
  const who = ta.updatedByEmail ? ` · ${ta.updatedByEmail}` : '';
  return `Last saved ${when}${who}`;
}

export default function TeamAccessScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [savedCaptionText, setSavedCaptionText] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sub: { fontSize: 14, color: c.textSecondary, marginBottom: spacing.sm, fontFamily: f.regular },
        meta: { fontSize: 12, color: c.textSubtle, marginBottom: spacing.md, fontFamily: f.regular },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          gap: spacing.md,
        },
        label: { flex: 1, fontSize: 15, color: c.text, fontFamily: f.regular },
      }),
    [c, f],
  );

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await api.portalMe();
        if (cancelled) return;
        if (!me.canManageTeamAccess) {
          setDraft({});
          setLabels(me.sectionLabels ?? {});
          return;
        }
        const ta = await api.portalTeamAccessGet();
        if (cancelled) return;
        setDraft({ ...ta.teamSectionAccess });
        setLabels(me.sectionLabels ?? {});
        setSavedCaptionText(savedCaption(ta));
      } catch (e) {
        if (!cancelled) Alert.alert('Error', e instanceof Error ? e.message : 'Could not load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.portalTeamAccessPatch(draft);
      setDraft({ ...res.teamSectionAccess });
      setSavedCaptionText(savedCaption(res));
      Alert.alert('Saved', 'Team portal access updated.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset team portal ACL?',
      'This restores the default on/off map for team accounts. Admins always keep full access. Team-only changes to valued testers, allowlists, etc. are not undone — use Valued testers for allowlist reset.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setResetting(true);
              try {
                const res = await api.portalTeamAccessReset();
                setDraft({ ...res.teamSectionAccess });
                setSavedCaptionText(savedCaption(res));
                Alert.alert('Reset', 'Team section access restored to defaults.');
              } catch (e) {
                Alert.alert('Reset failed', e instanceof Error ? e.message : 'Try again');
              } finally {
                setResetting(false);
              }
            })();
          },
        },
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

  const keys = Object.keys(draft).sort();

  if (keys.length === 0) {
    return (
      <Screen scroll>
        <Text style={styles.sub}>You do not have permission to edit team access.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Text style={styles.sub}>
        Turn sections on or off for team accounts. Admins always see every section and are never blocked by these
        toggles. By default, team can use Valued testers (allowlist + revoke); turn it off here if you need to. Reset
        restores server defaults (including that default).
      </Text>
      {savedCaptionText ? <Text style={styles.meta}>{savedCaptionText}</Text> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {keys.map((k) => (
          <View key={k} style={styles.row}>
            <Text style={styles.label}>{labels[k] ?? k}</Text>
            <Switch
              value={Boolean(draft[k])}
              onValueChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
              trackColor={{ true: c.primaryMuted }}
              thumbColor={draft[k] ? c.primary : undefined}
            />
          </View>
        ))}
      </ScrollView>
      <Button title={saving ? 'Saving…' : 'Save changes'} onPress={() => void save()} loading={saving} />
      <Button
        title={resetting ? 'Resetting…' : 'Reset to defaults (override ACL)'}
        variant="secondary"
        onPress={resetToDefaults}
        disabled={saving || resetting}
      />
    </Screen>
  );
}
