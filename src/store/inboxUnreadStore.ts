import { create } from 'zustand';

import * as serverApi from '@/src/lib/serverApi';

type Row = { unread?: boolean };

type InboxUnreadState = {
  unreadTotal: number;
  /** Call after `conversationsList` to avoid a second network request. */
  syncFromList: (conversations: Row[]) => void;
  /** Refetch inbox and recompute badge (e.g. after marking read). */
  refreshFromServer: () => Promise<void>;
};

export const useInboxUnreadStore = create<InboxUnreadState>((set) => ({
  unreadTotal: 0,
  syncFromList: (conversations) =>
    set({ unreadTotal: conversations.filter((c) => c.unread).length }),
  refreshFromServer: async () => {
    try {
      const { conversations } = await serverApi.conversationsList();
      set({ unreadTotal: conversations.filter((c) => c.unread).length });
    } catch {
      set({ unreadTotal: 0 });
    }
  },
}));
