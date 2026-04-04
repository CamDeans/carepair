import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getApiBaseUrl } from '@/src/lib/config';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';

export default function GateScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: c.background,
          padding: 24,
        },
        errTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: c.text,
          marginBottom: 8,
          textAlign: 'center',
          fontFamily: f.semibold,
        },
        errBody: {
          fontSize: 15,
          color: c.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          fontFamily: f.regular,
        },
      }),
    [c, f],
  );

  const [persistWait, setPersistWait] = useState(() => useAuthStore.persist.hasHydrated());
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const loadSession = useAuthStore((s) => s.loadSession);
  const hasSeenOnboarding = useAuthStore((s) => s.hasSeenOnboarding);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setPersistWait(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setPersistWait(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!persistWait) return;
    void loadSession();
  }, [persistWait, loadSession]);

  if (!getApiBaseUrl()) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Configuration needed</Text>
        <Text style={styles.errBody}>
          This build is not pointed at a CarePair server. Ask your administrator or check the setup guide for your team.
        </Text>
      </View>
    );
  }

  if (!sessionReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/login" />;
  if (!user.profilePublished) {
    if (user.role === 'admin' || user.role === 'team') {
      return <Redirect href="/(main)/(tabs)/discover" />;
    }
    if (user.role === 'valued_tester') {
      return user.valuedTesterPersona === 'caregiver' ? (
        <Redirect href="/caregiver-setup" />
      ) : (
        <Redirect href="/family-setup" />
      );
    }
    if (user.role === 'family') return <Redirect href="/family-setup" />;
    return <Redirect href="/caregiver-setup" />;
  }

  return <Redirect href="/discover" />;
}
