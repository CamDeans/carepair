import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { emailSchema, formatZodError } from '@/src/lib/validation';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

export default function ForgotPasswordScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: {
          fontSize: 24,
          fontWeight: '800',
          color: c.text,
          marginBottom: spacing.sm,
          fontFamily: f.semibold,
        },
        sub: { fontSize: 15, color: c.textSecondary, marginBottom: spacing.lg, fontFamily: f.regular },
      }),
    [c, f],
  );

  const submit = () => {
    const v = emailSchema.safeParse(email);
    if (!v.success) {
      Alert.alert('Invalid email', formatZodError(v.error));
      return;
    }
    setSent(true);
    Alert.alert('Check your email', 'When a backend is connected, a reset link will be sent.');
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Reset password</Text>
      <Text style={styles.sub}>We&apos;ll email you a link when your API is configured.</Text>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Button title={sent ? 'Link requested' : 'Send reset link'} onPress={submit} disabled={!email.trim() || sent} />
    </Screen>
  );
}
