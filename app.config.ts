import type { ExpoConfig } from 'expo/config';

const APP_NAME = 'CarePair';

/**
 * Expo / EAS project UUID (expo.dev). Override with env `EAS_PROJECT_ID` for a different Expo project.
 * Must match the project you run `eas build` against or EAS reports eas-config-mismatch.
 */
const EAS_PROJECT_ID_DEFAULT = '780ad853-e5b6-441d-985e-6f346ec16060';

/** Injected at EAS Build / `expo prebuild` — do not use EXPO_PUBLIC_* (keeps keys out of the JS bundle). */
const googleMapsIosKey = process.env.GOOGLE_MAPS_IOS_API_KEY ?? '';
const googleMapsAndroidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

const config: ExpoConfig = {
  name: APP_NAME,
  slug: 'carepair',
  version: '1.1.0',
  orientation: 'portrait',
  /** Native app only — avoids web being treated as a release surface. */
  platforms: ['ios', 'android'],
  icon: './assets/brand/app-icon.png',
  scheme: 'carepair',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/brand/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FBF9F6',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.carepair.app',
    ...(googleMapsIosKey
      ? { config: { googleMapsApiKey: googleMapsIosKey } }
      : {}),
    infoPlist: {
      // Standard HTTPS only → false avoids extra App Store Connect export questions.
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'CarePair uses your photo library so you can add a profile picture.',
      NSCameraUsageDescription:
        'CarePair uses the camera so you can take a profile picture.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/brand/adaptive-icon.png',
      backgroundColor: '#0A0A0A',
    },
    package: 'com.carepair.app',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    ...(googleMapsAndroidKey
      ? { config: { googleMaps: { apiKey: googleMapsAndroidKey } } }
      : {}),
  },
  plugins: [
    'expo-router',
    [
      'expo-notifications',
      {
        icon: './assets/brand/app-icon.png',
        color: '#D85A30',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        // Keys must exist (even empty) or the plugin logs a warning; use env when you enable uploads.
        organization: process.env.SENTRY_ORG ?? '',
        project: process.env.SENTRY_PROJECT ?? '',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID?.trim() || EAS_PROJECT_ID_DEFAULT,
    },
    stripeCustomerPortalUrl: process.env.EXPO_PUBLIC_STRIPE_PORTAL_URL ?? '',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
    googleMapsIosConfigured: Boolean(googleMapsIosKey),
    googleMapsAndroidConfigured: Boolean(googleMapsAndroidKey),
  },
};

export default config;
