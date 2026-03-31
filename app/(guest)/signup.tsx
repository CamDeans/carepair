import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useAuthStore } from '@/src/store/authStore';
import type { UserRole } from '@/src/types/models';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { radius, spacing } from '@/src/theme/tokens';

export default function SignupScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: {
          fontSize: 28,
          fontWeight: '600',
          color: c.text,
          marginBottom: spacing.sm,
          letterSpacing: -0.56,
          fontFamily: f.semibold,
        },
        sub: { fontSize: 15, color: c.textSecondary, marginBottom: spacing.sm, fontFamily: f.regular },
        roles: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
        roleChip: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
        },
        roleChipOn: { borderColor: c.primary, backgroundColor: c.primaryMuted },
        roleText: { fontWeight: '600', color: c.text, fontFamily: f.semibold },
        roleTextOn: { color: c.primaryDark, fontFamily: f.semibold },
        termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
        box: {
          width: 22,
          height: 22,
          borderRadius: radius.sm,
          borderWidth: 2,
          borderColor: c.border,
          marginTop: 2,
        },
        boxOn: { backgroundColor: c.primary, borderColor: c.primary },
        terms: {
          flex: 1,
          fontSize: 14,
          color: c.textSecondary,
          lineHeight: 20,
          fontFamily: f.regular,
        },
      }),
    [c, f],
  );

  const signup = useAuthStore((s) => s.signup);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('family');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await signup(email, password, role, terms);
      router.replace('/');
    } catch (e) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Create your account</Text>
      <Text style={styles.sub}>I am signing up as:</Text>
      <View style={styles.roles}>
        {(['family', 'caregiver'] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            accessibilityRole="button"
            accessibilityLabel={r === 'family' ? 'Sign up as family' : 'Sign up as caregiver'}
            accessibilityState={{ selected: role === r }}
            style={[styles.roleChip, role === r && styles.roleChipOn]}>
            <Text style={[styles.roleText, role === r && styles.roleTextOn]} importantForAccessibility="no">
              {r === 'family' ? 'Family' : 'Caregiver'}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable
        style={styles.termsRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}
        accessibilityLabel="Accept terms and privacy policy"
        onPress={() => setTerms(!terms)}>
        <View style={[styles.box, terms && styles.boxOn]} importantForAccessibility="no" />
        <Text style={styles.terms} importantForAccessibility="no">
          I accept the Terms and Privacy policy (placeholder).
        </Text>
      </Pressable>
      <Button
        title="Continue"
        onPress={onSubmit}
        loading={loading}
        disabled={!email || !password || !terms}
      />
      <GoogleSignInButton flow="signup" signupRole={role} disabled={!terms} />
      <Button title="Log in instead" variant="ghost" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
