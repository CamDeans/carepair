import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { InlineError } from '@/src/components/ui/InlineError';
import { TextField } from '@/src/components/ui/TextField';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, spacing } from '@/src/theme/tokens';

export default function LoginScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.sm },
      sub: { ...t.caption, marginBottom: layout.sectionGap },
      link: { ...t.link, marginBottom: spacing.md },
    });
  }, [c, f]);

  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const onSubmit = async () => {
    setSubmitError('');
    setEmailError('');
    setPasswordError('');
    if (!email.trim()) {
      setEmailError('Enter your email.');
      return;
    }
    if (!password) {
      setPasswordError('Enter your password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not log in. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Welcome back</Text>
      <Text style={styles.sub}>Password must be at least 8 characters. Use the same email you registered with.</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="you@example.com"
        error={emailError || undefined}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        error={passwordError || undefined}
      />
      {submitError ? <InlineError message={submitError} onRetry={onSubmit} retryLabel="Try again" /> : null}
      <Text style={styles.link} onPress={() => router.push('/forgot-password')}>
        Forgot password?
      </Text>
      <View style={{ gap: spacing.md }}>
        <Button title="Log in" onPress={onSubmit} loading={loading} disabled={!email || !password} />
        <GoogleSignInButton flow="login" />
        <Button title="Create an account" variant="ghost" onPress={() => router.replace('/signup')} />
      </View>
      <Text style={styles.link} onPress={() => router.push('/staff-signup')}>
        Staff or tester signup
      </Text>
    </Screen>
  );
}
