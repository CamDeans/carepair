import * as SecureStore from 'expo-secure-store';

const KEY = 'carepair_access_token';

let memoryToken: string | null = null;

export async function persistAccessToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
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
