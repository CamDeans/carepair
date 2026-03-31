import { getChatSocket } from '@/src/lib/socket';
import { useInboxUnreadStore } from '@/src/store/inboxUnreadStore';

let debounce: ReturnType<typeof setTimeout> | null = null;

function scheduleInboxRefresh() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    debounce = null;
    void useInboxUnreadStore.getState().refreshFromServer();
  }, 400);
}

/**
 * When the server emits `message:new` to this user's socket room, refresh unread counts
 * (replaces slow polling for real-time badge updates).
 */
export function subscribeInboxUnreadOnChatSocket(): () => void {
  let cancelled = false;
  let cleanupSocket: (() => void) | undefined;

  void getChatSocket()
    .then((socket) => {
      if (cancelled) return;
      const handler = () => scheduleInboxRefresh();
      socket.on('message:new', handler);
      cleanupSocket = () => socket.off('message:new', handler);
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    cleanupSocket?.();
    if (debounce) {
      clearTimeout(debounce);
      debounce = null;
    }
  };
}
