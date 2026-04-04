import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { InlineError } from '@/src/components/ui/InlineError';
import { TextField } from '@/src/components/ui/TextField';
import { getPrivacyUrl, getTermsUrl } from '@/src/lib/config';
import { useAuthStore } from '@/src/store/authStore';
import type { UserRole } from '@/src/types/models';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { radius, spacing } from '@/src/theme/tokens';

export default function SignupScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.sm },
      sub: { ...t.sub, marginBottom: spacing.sm },
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
      roleTextOn: { color: c.brandYellowText, fontFamily: f.semibold },
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
      link: { color: c.primary, fontWeight: '600', textDecorationLine: 'underline', fontFamily: f.semibold },
    });
  }, [c, f]);

  const signup = useAuthStore((s) => s.signup);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('family');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const openTerms = () => {
    const u = getTermsUrl();
    if (u) void Linking.openURL(u);
    else Alert.alert('Terms', 'Add EXPO_PUBLIC_TERMS_URL to your app config (see mobile/.env.example).');
  };

  const openPrivacy = () => {
    const u = getPrivacyUrl();
    if (u) void Linking.openURL(u);
    else Alert.alert('Privacy', 'Add EXPO_PUBLIC_PRIVACY_URL to your app config (see mobile/.env.example).');
  };

  const onSubmit = async () => {
    setSubmitError('');
    setEmailError('');
    setPasswordError('');
    if (!email.trim()) {
      setEmailError('Enter your email.');
      return;
    }
    if (password.length < 8) {
      setPasswordError('Use at least 8 characters.');
      return;
    }
    if (!terms) {
      setSubmitError('Accept the Terms and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim(), password, role, terms);
      router.replace('/');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Sign up failed. Try again.');
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
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        error={emailError || undefined}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={passwordError || undefined}
      />
      {submitError ? <InlineError message={submitError} onRetry={onSubmit} retryLabel="Try again" /> : null}
      <Pressable
        style={styles.termsRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}
        accessibilityLabel="Accept terms and privacy policy"
        onPress={() => setTerms(!terms)}>
        <View style={[styles.box, terms && styles.boxOn]} importantForAccessibility="no" />
        <Text style={styles.terms} importantForAccessibility="no">
          I agree to the{' '}
          <Text style={styles.link} onPress={openTerms} accessibilityRole="link">
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text style={styles.link} onPress={openPrivacy} accessibilityRole="link">
            Privacy Policy
          </Text>
          .
        </Text>
      </Pressable>
      <View style={{ gap: spacing.md }}>
        <Button
          title="Continue"
          onPress={onSubmit}
          loading={loading}
          disabled={!email || !password || !terms}
        />
        <GoogleSignInButton flow="signup" signupRole={role} disabled={!terms} />
        <Button title="Log in instead" variant="ghost" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}
