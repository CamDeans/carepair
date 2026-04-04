import NetInfo from '@react-native-community/netinfo';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

/**
 * Thin banner when the device reports no connection (offline UX).
 * API calls still use `httpJson` for timeout / “no internet” errors on failure.
 */
export function NetworkOfflineBanner() {
  const { colors: c, fonts: f } = useCarePairUi();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          backgroundColor: c.danger,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          paddingTop: Math.max(insets.top, spacing.sm),
        },
        text: {
          color: c.onPrimary,
          fontSize: 14,
          lineHeight: 20,
          textAlign: 'center',
          fontWeight: '600',
          fontFamily: f.medium,
        },
      }),
    [c.danger, c.onPrimary, f.medium, insets.top],
  );

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const noLink = state.isConnected === false;
      const unreachable = state.isInternetReachable === false;
      setOffline(noLink || unreachable);
    });
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.wrap} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>You appear to be offline. Some actions will fail until you reconnect.</Text>
    </View>
  );
}
