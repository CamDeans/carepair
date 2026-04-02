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
import { createTypographyStyles } from '@/src/theme/typography';
import { layout, radius, spacing } from '@/src/theme/tokens';

export default function SubscriptionScreen() {
  const { colors: c, fonts: f } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [access, setAccess] = useState<CareAccessDto | null>(null);
  const [opening, setOpening] = useState(false);

  const styles = useMemo(() => {
    const t = createTypographyStyles(c, f);
    return StyleSheet.create({
      h1: { ...t.sectionTitle, fontSize: 24, lineHeight: 28 },
      price: { ...t.sectionTitle, fontSize: 20, lineHeight: 26, color: c.primaryDark, marginTop: spacing.sm },
      sub: { ...t.sub, marginVertical: spacing.md },
      box: {
        padding: spacing.lg,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        marginBottom: spacing.md,
      },
      row: { ...t.sub, color: c.text, marginBottom: spacing.xs },
      legal: { ...t.caption, fontSize: 12, lineHeight: 18, marginTop: spacing.lg },
    });
  }, [c, f]);

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
