import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { getStripePortalUrl } from '@/src/lib/config';
import * as api from '@/src/lib/serverApi';
import type { CareAccessDto } from '@/src/lib/serverApi';
import { useAuthStore } from '@/src/store/authStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

export default function SubscriptionScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [access, setAccess] = useState<CareAccessDto | null>(null);
  const [opening, setOpening] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        h1: { fontSize: 24, fontWeight: '800', color: c.text, fontFamily: f.semibold },
        price: { fontSize: 20, fontWeight: '700', color: c.primaryDark, marginTop: spacing.sm, fontFamily: f.semibold },
        sub: {
          fontSize: 15,
          color: c.textSecondary,
          lineHeight: 22,
          marginVertical: spacing.md,
          fontFamily: f.regular,
        },
        box: {
          padding: spacing.md,
          backgroundColor: c.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          marginBottom: spacing.md,
        },
        row: { fontSize: 15, color: c.text, marginBottom: spacing.xs, fontFamily: f.regular },
        legal: { fontSize: 12, color: c.textSecondary, marginTop: spacing.lg, lineHeight: 18, fontFamily: f.regular },
      }),
    [c, f],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const a = await api.subscriptionCareAccess();
          if (!cancelled) setAccess(a);
        } catch {
          if (!cancelled) setAccess(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const trialActive =
    !!(user?.careTrialEndsAt && new Date(user.careTrialEndsAt) > new Date()) || user?.subscriptionStatus === 'trialing';
  const subActive = user?.subscriptionStatus === 'active';

  const openCheckout = async () => {
    setOpening(true);
    try {
      const { url } = await api.stripeCheckoutSession();
      if (url) await WebBrowser.openBrowserAsync(url);
      else Alert.alert('Stripe', 'Checkout is not configured on the server.');
    } catch (e) {
      Alert.alert('Stripe', e instanceof Error ? e.message : 'Failed');
    } finally {
      setOpening(false);
    }
  };

  const openPortal = async () => {
    const fallback = getStripePortalUrl();
    setOpening(true);
    try {
      const returnUrl = Linking.createURL('/');
      const { url } = await api.stripePortalSession(returnUrl);
      if (url) {
        await WebBrowser.openBrowserAsync(url);
        await refreshMe();
        const a = await api.subscriptionCareAccess();
        setAccess(a);
        return;
      }
      if (fallback?.trim()) {
        await WebBrowser.openBrowserAsync(fallback);
        return;
      }
      Alert.alert('Billing', 'Set Stripe on the server or EXPO_PUBLIC_STRIPE_PORTAL_URL for portal fallback.');
    } catch (e) {
      Alert.alert('Billing', e instanceof Error ? e.message : 'Failed');
    } finally {
      setOpening(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.h1}>CarePair subscription</Text>
      <Text style={styles.price}>$19.99 / month</Text>
      <Text style={styles.sub}>
        Start checkout to subscribe, or open the customer portal to manage billing. CareSpace access follows your trial and subscription
        status from the server.
      </Text>
      <View style={styles.box}>
        <Text style={styles.row}>CareSpace access: {access?.canUseCareSpace ? 'Yes' : 'No'}</Text>
        <Text style={styles.row}>Trial window: {trialActive ? 'Yes' : 'No'}</Text>
        <Text style={styles.row}>Subscribed: {subActive ? 'Yes' : 'No'}</Text>
        <Text style={styles.row}>Status: {user?.subscriptionStatus ?? '—'}</Text>
      </View>
      <Button title="Subscribe with Stripe" onPress={() => void openCheckout()} loading={opening} />
      <Button title="Open billing portal" variant="secondary" onPress={() => void openPortal()} loading={opening} />
      <Text style={styles.legal}>
        App Store / Play policies: confirm with counsel whether digital features require in-app purchase in your jurisdiction.
      </Text>
    </Screen>
  );
}
