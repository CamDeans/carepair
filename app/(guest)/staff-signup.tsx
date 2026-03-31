import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useAuthStore } from '@/src/store/authStore';
import type { StaffRegisterRole } from '@/src/types/models';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

const ROLES: { id: StaffRegisterRole; label: string; hint: string }[] = [
  { id: 'admin', label: 'Admin', hint: 'Founder — full staff portal + team permissions' },
  { id: 'team', label: 'Team', hint: 'Second seat — portal areas set by admin' },
  { id: 'valued_tester', label: 'Valued tester', hint: 'Full app access for one year (limited slots)' },
];

export default function StaffSignupScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const registerStaff = useAuthStore((s) => s.registerStaff);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRegisterRole>('team');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: {
          fontSize: 24,
          fontWeight: '600',
          color: c.text,
          marginBottom: spacing.sm,
          fontFamily: f.semibold,
        },
        sub: { fontSize: 14, color: c.textSecondary, marginBottom: spacing.lg, lineHeight: 20, fontFamily: f.regular },
        roles: { gap: spacing.sm, marginBottom: spacing.lg },
        chip: {
          padding: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
        },
        chipOn: { borderColor: c.primary, backgroundColor: c.primaryMuted },
        chipTitle: { fontSize: 16, fontWeight: '600', color: c.text, fontFamily: f.semibold },
        chipHint: { fontSize: 13, color: c.textSecondary, marginTop: 4, fontFamily: f.regular },
        termsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
        terms: { flex: 1, fontSize: 14, color: c.textSecondary, fontFamily: f.regular },
        box: {
          width: 22,
          height: 22,
          borderRadius: radius.sm,
          borderWidth: 2,
          borderColor: c.border,
        },
        boxOn: { backgroundColor: c.primary, borderColor: c.primary },
        link: { color: c.primary, marginTop: spacing.md, fontFamily: f.medium },
      }),
    [c, f],
  );

  const submit = async () => {
    setLoading(true);
    try {
      await registerStaff(email, password, role, terms);
      router.replace('/');
    } catch (e) {
      Alert.alert('Could not register', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Staff &amp; tester signup</Text>
      <Text style={styles.sub}>
        Your email must be on the server allowlist (admin / team) or a valued-tester slot must be free. Use the same API as the app.
      </Text>
      <View style={styles.roles}>
        {ROLES.map((r) => (
          <Pressable
            key={r.id}
            style={[styles.chip, role === r.id && styles.chipOn]}
            onPress={() => setRole(r.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: role === r.id }}
            accessibilityLabel={r.label}>
            <Text style={styles.chipTitle}>{r.label}</Text>
            <Text style={styles.chipHint}>{r.hint}</Text>
          </Pressable>
        ))}
      </View>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Password (8+ characters)" value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable
        style={styles.termsRow}
        onPress={() => setTerms(!terms)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}>
        <View style={[styles.box, terms && styles.boxOn]} importantForAccessibility="no" />
        <Text style={styles.terms} importantForAccessibility="no">
          I accept the terms (placeholder) for this internal account.
        </Text>
      </Pressable>
      <Button title="Create account" onPress={() => void submit()} loading={loading} disabled={!email || !password || !terms} />
      <Text style={styles.link} onPress={() => router.back()}>
        Back to log in
      </Text>
    </Screen>
  );
}
