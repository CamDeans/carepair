import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/src/store/authStore';
import type { AppearancePreference } from '@/src/store/uiPreferencesStore';
import { useUiPreferencesStore } from '@/src/store/uiPreferencesStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';
import { spacing } from '@/src/theme/tokens';

function appearanceLabel(a: AppearancePreference): string {
  if (a === 'system') return 'Match system';
  if (a === 'light') return 'Light';
  return 'Dark';
}

export function MainTabHeaderActions() {
  const { colors: c } = useCarePairUi();
  const user = useAuthStore((s) => s.user);
  const showServiceStatus = user?.role === 'admin' || user?.role === 'team';
  const appearance = useUiPreferencesStore((s) => s.appearance);
  const setAppearance = useUiPreferencesStore((s) => s.setAppearance);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginRight: spacing.sm },
        hit: { padding: spacing.sm },
      }),
    [],
  );

  const openAppearance = () => {
    Alert.alert('Appearance', `Current: ${appearanceLabel(appearance)}`, [
      { text: 'Match system', onPress: () => setAppearance('system') },
      { text: 'Light', onPress: () => setAppearance('light') },
      { text: 'Dark', onPress: () => setAppearance('dark') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.row}>
      {showServiceStatus ? (
        <Pressable
          style={styles.hit}
          accessibilityRole="button"
          accessibilityLabel="Server status"
          onPress={() => router.push('/system-health' as Href)}>
          <FontAwesome name="heartbeat" size={20} color={c.primary} />
        </Pressable>
      ) : null}
      <Pressable
        style={styles.hit}
        accessibilityRole="button"
        accessibilityLabel="Appearance"
        onPress={openAppearance}>
        <FontAwesome name="adjust" size={20} color={c.textSecondary} />
      </Pressable>
      <Pressable
        style={styles.hit}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        onPress={() => router.push('/notifications-settings' as const)}>
        <FontAwesome name="bell" size={20} color={c.textSecondary} />
      </Pressable>
    </View>
  );
}
