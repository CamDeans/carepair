import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { subscribeInboxUnreadOnChatSocket } from '@/src/lib/inboxSocketRefresh';
import { subscribePushNotificationDeepLinks } from '@/src/lib/notificationDeepLink';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';

export default function MainLayout() {
  const router = useRouter();
  const { colors: c } = useCarePairUi();

  const screenOptions = useMemo(
    () => ({
      headerTintColor: c.primaryDark,
      headerStyle: { backgroundColor: c.surface },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: c.background },
      /** Native stack: edge / full-screen swipe to go back (iOS especially). */
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
      animation: 'slide_from_right' as const,
    }),
    [c],
  );

  useEffect(() => {
    const stopPushNav = subscribePushNotificationDeepLinks(router);
    const stopInboxSocket = subscribeInboxUnreadOnChatSocket();
    return () => {
      stopPushNav();
      stopInboxSocket();
    };
  }, [router]);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="caregiver/[id]" options={{ title: 'Caregiver', headerBackTitle: '' }} />
      <Stack.Screen name="family/[id]" options={{ title: 'Family', headerBackTitle: '' }} />
      <Stack.Screen name="conversation/[id]" options={{ title: 'Messages' }} />
      <Stack.Screen name="connection-request" options={{ title: 'Connect', presentation: 'modal' }} />
      <Stack.Screen name="meetup-schedule" options={{ title: 'Schedule meet-up' }} />
      <Stack.Screen name="meetup-proposals" options={{ title: 'Meet-up proposals' }} />
      <Stack.Screen name="shift/new" options={{ title: 'Add shift' }} />
      <Stack.Screen name="shift/[id]" options={{ title: 'Shift' }} />
      <Stack.Screen name="care-notes" options={{ title: 'Care notes' }} />
      <Stack.Screen name="profile-edit" options={{ title: 'Edit profile' }} />
      <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
      <Stack.Screen name="notifications-settings" options={{ title: 'Notifications' }} />
      <Stack.Screen name="help" options={{ title: 'Help & support' }} />
      <Stack.Screen name="guidelines" options={{ title: 'Community guidelines' }} />
      <Stack.Screen name="staff-portal" options={{ headerShown: false }} />
    </Stack>
  );
}
