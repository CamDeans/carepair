import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { formatZodError, passwordSchema } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { spacing } from '@/src/theme/tokens';

export default function ResetPasswordScreen() {
  const { token: rawToken } = useLocalSearchParams<{ token?: string }>();
  const token = typeof rawToken === 'string' ? rawToken : Array.isArray(rawToken) ? rawToken[0] : '';
  const { colors: c, fonts: f } = useCarePairUi();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, fontSize: 24, marginBottom: spacing.sm },
      sub: { ...t.caption, marginBottom: spacing.lg, lineHeight: 20 },
      err: { ...t.caption, color: c.danger, marginBottom: spacing.md },
    });
  }, [c, f]);

  const save = () => {
    if (!token?.trim()) {
      Alert.alert('Missing link', 'Open the reset link from your email again.');
      return;
    }
    const v = passwordSchema.safeParse(password);
    if (!v.success) {
      Alert.alert('Password', formatZodError(v.error));
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        await api.authResetPassword(token.trim(), v.data);
        Alert.alert('Password updated', 'You can log in with your new password.', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
      } catch (e) {
        Alert.alert('Reset failed', e instanceof Error ? e.message : 'Link may have expired. Request a new one.');
      } finally {
        setLoading(false);
      }
    })();
  };

  if (!token?.trim()) {
    return (
      <Screen scroll>
        <Text style={styles.err}>No reset token in this link. Request a new reset email from the log-in screen.</Text>
        <Button title="Go to log in" onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.h1}>Choose a new password</Text>
      <Text style={styles.sub}>Use at least 8 characters.</Text>
      <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={loading ? 'Saving…' : 'Save password'} onPress={save} loading={loading} disabled={!password} />
    </Screen>
  );
}
