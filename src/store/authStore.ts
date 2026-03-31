import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { clearMemoryToken, persistAccessToken } from '@/src/lib/authToken';
import { registerExpoPushForCurrentUser, unregisterExpoPushForCurrentUser } from '@/src/lib/pushSync';
import { disconnectChatSocket } from '@/src/lib/socket';
import * as serverApi from '@/src/lib/serverApi';
import { credentialsSchema, formatZodError } from '@/src/lib/validation';
import type { StaffRegisterRole, UserRole } from '@/src/types/models';

export type MeUser = serverApi.MeUser;

interface AuthState {
  /** SecureStore + /auth/me finished */
  sessionReady: boolean;
  hasSeenOnboarding: boolean;
  user: MeUser | null;
  setHasSeenOnboarding: (v: boolean) => void;
  /** Load JWT from SecureStore and fetch /auth/me */
  loadSession: () => Promise<void>;
  refreshMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: UserRole, acceptTerms: boolean) => Promise<void>;
  /** Admin / team / valued_tester — server enforces email allowlists and tester cap. */
  registerStaff: (email: string, password: string, role: StaffRegisterRole, acceptTerms: boolean) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionReady: false,
      hasSeenOnboarding: false,
      user: null,
      setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),
      loadSession: async () => {
        set({ sessionReady: false });
        try {
          const { getAccessToken } = await import('@/src/lib/authToken');
          const t = await getAccessToken();
          if (!t) {
            set({ user: null, sessionReady: true });
            return;
          }
          const { user } = await serverApi.authMe();
          set({ user, sessionReady: true });
          void registerExpoPushForCurrentUser();
        } catch {
          clearMemoryToken();
          await persistAccessToken(null);
          set({ user: null, sessionReady: true });
        }
      },
      refreshMe: async () => {
        const { user } = await serverApi.authMe();
        set({ user });
        void registerExpoPushForCurrentUser();
      },
      login: async (email, password) => {
        const v = credentialsSchema.safeParse({ email, password });
        if (!v.success) throw new Error(formatZodError(v.error));
        const data = await serverApi.authLogin(v.data.email, v.data.password);
        await persistAccessToken(data.token);
        set({ user: data.user });
        void registerExpoPushForCurrentUser();
      },
      signup: async (email, password, role, acceptTerms) => {
        if (!acceptTerms) throw new Error('Accept terms to continue.');
        const v = credentialsSchema.safeParse({ email, password });
        if (!v.success) throw new Error(formatZodError(v.error));
        const data = await serverApi.authRegister(v.data.email, v.data.password, role);
        await persistAccessToken(data.token);
        set({ user: data.user });
        void registerExpoPushForCurrentUser();
      },
      registerStaff: async (email, password, role, acceptTerms) => {
        if (!acceptTerms) throw new Error('Accept terms to continue.');
        const v = credentialsSchema.safeParse({ email, password });
        if (!v.success) throw new Error(formatZodError(v.error));
        const data = await serverApi.authRegister(v.data.email, v.data.password, role);
        await persistAccessToken(data.token);
        set({ user: data.user });
        void registerExpoPushForCurrentUser();
      },
      loginWithGoogleIdToken: async (idToken, role) => {
        const data = await serverApi.authGoogle(idToken, role);
        await persistAccessToken(data.token);
        set({ user: data.user });
        void registerExpoPushForCurrentUser();
      },
      logout: async () => {
        await unregisterExpoPushForCurrentUser();
        disconnectChatSocket();
        await persistAccessToken(null);
        clearMemoryToken();
        set({ user: null });
      },
    }),
    {
      name: 'carepair-ui',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ hasSeenOnboarding: s.hasSeenOnboarding }),
    },
  ),
);
