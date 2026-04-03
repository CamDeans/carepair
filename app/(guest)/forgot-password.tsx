import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { requireApiBase } from '@/src/lib/config';
import * as api from '@/src/lib/serverApi';
import { emailSchema, formatZodError } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, spacing } from '@/src/theme/tokens';

export default function ForgotPasswordScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, fontSize: 24, lineHeight: 28, marginBottom: spacing.sm },
      sub: { ...t.sub, marginBottom: layout.sectionGap },
    });
  }, [c, f]);

  const submit = () => {
    const v = emailSchema.safeParse(email.trim());
    if (!v.success) {
      Alert.alert('Invalid email', formatZodError(v.error));
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        requireApiBase();
        await api.authForgotPassword(v.data);
        setSent(true);
        Alert.alert(
          'Check your email',
          'If an account exists for that address, we sent a reset link. Open it on this device to finish in the CarePair app.',
        );
      } catch (e) {
        Alert.alert('Request failed', e instanceof Error ? e.message : 'Try again.');
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Reset password</Text>
      <Text style={styles.sub}>
        We will email you a secure link. The server must have RESEND_API_KEY and RESEND_FROM_EMAIL configured to deliver mail in production.
      </Text>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button title={sent ? 'Link sent' : loading ? 'Sending…' : 'Send reset link'} onPress={submit} disabled={!email.trim() || sent || loading} loading={loading} />
      <Button title="Back to log in" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
