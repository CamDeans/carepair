import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Expo Go does not ship `react-native-maps` in the client binary (RNMapsAirModule).
 * Skip loading the native module there so route discovery does not crash; dev/production builds can load it.
 */
const allowMapsLoad = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export type ReactNativeMapsModule = typeof import('react-native-maps');

let cached: ReactNativeMapsModule | null | undefined;

export function getReactNativeMaps(): ReactNativeMapsModule | null {
  if (cached !== undefined) return cached;
  if (!allowMapsLoad) {
    cached = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-maps') as ReactNativeMapsModule;
  } catch {
    cached = null;
  }
  return cached;
}
