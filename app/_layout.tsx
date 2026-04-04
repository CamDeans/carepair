import '@/src/lib/sentryClient';

import { ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Fragment, useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NetworkOfflineBanner } from '@/src/components/NetworkOfflineBanner';
import { RootErrorBoundary } from '@/src/components/RootErrorBoundary';
import { logEnvDiagnostics } from '@/src/lib/envDiagnostics';
import { CarePairUiProvider, useCarePairUi } from '@/src/theme/CarePairUiContext';
import { carePairDarkNavigationTheme, carePairLightNavigationTheme } from '@/src/theme/navigationTheme';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export { RootErrorBoundary as ErrorBoundary };

SplashScreen.preventAutoHideAsync();

function SplashGate() {
  const { fontsLoaded } = useCarePairUi();

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
      return;
    }
    const t = setTimeout(() => void SplashScreen.hideAsync(), 4000);
    return () => clearTimeout(t);
  }, [fontsLoaded]);

  return null;
}

function RootLayout() {
  useEffect(() => {
    logEnvDiagnostics();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Fragment>
          <ReducedMotionConfig mode={ReduceMotion.System} />
          <CarePairUiProvider>
            <SplashGate />
            <RootLayoutNav />
          </CarePairUiProvider>
        </Fragment>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

function RootLayoutNav() {
  const { resolvedScheme } = useCarePairUi();

  return (
    <ThemeProvider
      value={resolvedScheme === 'dark' ? carePairDarkNavigationTheme : carePairLightNavigationTheme}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <NetworkOfflineBanner />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(guest)" />
            <Stack.Screen name="(main)" />
          </Stack>
        </View>
      </View>
    </ThemeProvider>
  );
}
