import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import * as serverApi from '@/src/lib/serverApi';

let cachedExpoPushToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function resolveProjectId(): string | undefined {
  const id = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return undefined;
  return id;
}

/** Registers for Expo push (when EAS project id is set), then POSTs token to the API. Best-effort; ignores failures. */
export async function registerExpoPushForCurrentUser(): Promise<void> {
  if (Platform.OS === 'web') return;
  const projectId = resolveProjectId();
  if (!projectId) return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const next =
      existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
    if (next !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token?.trim()) return;
    cachedExpoPushToken = token;
    await serverApi.pushRegister(token);
  } catch {
    cachedExpoPushToken = null;
  }
}

export async function unregisterExpoPushForCurrentUser(): Promise<void> {
  const t = cachedExpoPushToken;
  cachedExpoPushToken = null;
  if (!t) return;
  try {
    await serverApi.pushUnregister(t);
  } catch {
    /* non-fatal */
  }
}
