import { Stack } from 'expo-router';
import { useMemo } from 'react';

import { useCarePairUi } from '@/src/theme/CarePairUiContext';

export default function StaffPortalLayout() {
  const { colors: c } = useCarePairUi();
  const screenOptions = useMemo(
    () => ({
      headerTintColor: c.primaryDark,
      headerStyle: { backgroundColor: c.surface },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: c.background },
    }),
    [c],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Staff portal' }} />
      <Stack.Screen name="team-access" options={{ title: 'Team access' }} />
      <Stack.Screen name="section/[id]" options={{ title: 'Section' }} />
    </Stack>
  );
}
