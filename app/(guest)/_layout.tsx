import { Stack } from 'expo-router';
import { useMemo } from 'react';

import { BrandLogo } from '@/src/components/BrandLogo';
import { useCarePairUi } from '@/src/theme/CarePairUiContext';

export default function GuestLayout() {
  const { colors: c } = useCarePairUi();

  const screenOptions = useMemo(
    () => ({
      headerTintColor: c.primaryDark,
      headerStyle: { backgroundColor: c.surface },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: c.background },
      headerTitle: () => <BrandLogo variant="header" />,
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
      animation: 'slide_from_right' as const,
    }),
    [c],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Log in' }} />
      <Stack.Screen name="signup" options={{ title: 'Sign up' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'New password' }} />
      <Stack.Screen name="staff-signup" options={{ title: 'Staff signup' }} />
      <Stack.Screen name="family-setup" options={{ title: 'Family profile', headerBackVisible: false }} />
      <Stack.Screen name="caregiver-setup" options={{ title: 'Caregiver profile', headerBackVisible: false }} />
    </Stack>
  );
}
