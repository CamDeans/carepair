import { io, type Socket } from 'socket.io-client';

import { getAccessToken } from '@/src/lib/authToken';
import { requireApiBase } from '@/src/lib/config';

let socket: Socket | null = null;

export function getSocketBaseUrl(): string {
  const api = requireApiBase();
  return api.replace(/\/api\/?$/, '');
}

export async function getChatSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in');
  const base = getSocketBaseUrl();
  socket = io(base, {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
}
