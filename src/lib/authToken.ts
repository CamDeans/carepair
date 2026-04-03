import * as SecureStore from 'expo-secure-store';

const KEY = 'carepair_access_token';
const REFRESH_KEY = 'carepair_refresh_token';

let memoryToken: string | null = null;

export async function persistRefreshToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(REFRESH_KEY, token);
  else await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function persistAccessToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (token) await SecureStore.setItemAsync(KEY, token);
  else {
    await SecureStore.deleteItemAsync(KEY);
    await persistRefreshToken(null);
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = await SecureStore.getItemAsync(KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function clearMemoryToken(): void {
  memoryToken = null;
}
