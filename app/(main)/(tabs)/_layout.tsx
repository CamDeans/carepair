import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { BrandLogo } from '@/src/components/BrandLogo';
import { useInboxUnreadStore } from '@/src/store/inboxUnreadStore';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';

function TabIcon({ name, color }: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={22} name={name} color={color} />;
}

export default function TabLayout() {
  const { colors: c } = useCarePairUi();
  const headerShown = useClientOnlyValue(false, true);
  const unreadTotal = useInboxUnreadStore((s) => s.unreadTotal);
  const refreshFromServer = useInboxUnreadStore((s) => s.refreshFromServer);

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: c.primary,
      tabBarInactiveTintColor: c.textSecondary,
      headerShown,
      headerTitle: () => <BrandLogo variant="header" />,
      tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
    }),
    [c, headerShown],
  );

  useEffect(() => {
    void refreshFromServer();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshFromServer();
    });
    return () => sub.remove();
  }, [refreshFromServer]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <TabIcon name="comments" color={color} />,
          tabBarBadge: unreadTotal > 0 ? unreadTotal : undefined,
        }}
      />
      <Tabs.Screen
        name="carespace"
        options={{
          title: 'CareSpace',
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <TabIcon name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
