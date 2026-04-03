import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import * as api from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, spacing } from '@/src/theme/tokens';

export default function DataPrivacyScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const logout = useAuthStore((s) => s.logout);
  const [password, setPassword] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.screenTitle, marginBottom: spacing.sm },
      sub: { ...t.caption, marginBottom: layout.sectionGap },
      section: { ...t.sectionTitle, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
    });
  }, [c, f]);

  const exportData = () => {
    void (async () => {
      setExporting(true);
      try {
        const data = await api.profileDataExport();
        const text = JSON.stringify(data, null, 2);
        await Share.share({ message: text, title: 'CarePair data export' });
      } catch (e) {
        Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again.');
      } finally {
        setExporting(false);
      }
    })();
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This anonymizes your profile and messages you sent. You will be signed out. This cannot be undone from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await api.profileAccountDelete({
                  ...(password.trim() ? { password: password.trim() } : {}),
                  ...(deletePhrase.trim() === 'DELETE' ? { confirmPhrase: 'DELETE' } : {}),
                });
                await logout();
                router.replace('/');
              } catch (e) {
                Alert.alert('Could not delete', e instanceof Error ? e.message : 'Check password or type DELETE for Google sign-in.');
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>Data &amp; privacy</Text>
      <Text style={styles.sub}>
        Export a JSON copy of your account and message metadata. Account deletion removes personal data from your profile and replaces past
        messages you sent with a placeholder; staff accounts must be removed by an administrator.
      </Text>

      <Text style={styles.section}>Export</Text>
      <Button title={exporting ? 'Preparing…' : 'Export my data'} onPress={exportData} disabled={exporting} />

      <Text style={styles.section}>Delete account</Text>
      <Text style={styles.sub}>
        If you use email and password, enter your password. If you use Google only, leave password blank and type DELETE in the confirmation
        box.
      </Text>
      <TextField label="Password (if applicable)" value={password} onChangeText={setPassword} secureTextEntry />
      <TextField label="Type DELETE to confirm" value={deletePhrase} onChangeText={setDeletePhrase} autoCapitalize="characters" />
      <Button
        title={deleting ? 'Working…' : 'Permanently delete account'}
        variant="danger"
        onPress={deleteAccount}
        disabled={deleting}
      />
    </Screen>
  );
}
