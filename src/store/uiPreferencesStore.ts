import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppearancePreference = 'system' | 'light' | 'dark';

const VALID = new Set<AppearancePreference>(['system', 'light', 'dark']);

function coerceAppearance(value: unknown): AppearancePreference {
  if (typeof value === 'string' && VALID.has(value as AppearancePreference)) {
    return value as AppearancePreference;
  }
  return 'light';
}

type PersistedSlice = {
  appearance: AppearancePreference;
  showDiscoverMap: boolean;
};

type State = PersistedSlice & {
  setAppearance: (appearance: AppearancePreference) => void;
  setShowDiscoverMap: (show: boolean) => void;
};

const PERSIST_VERSION = 2;

export const useUiPreferencesStore = create<State>()(
  persist(
    (set) => ({
      /** Default for new installs (iOS + Android): light until the user changes it in Settings. */
      appearance: 'light' satisfies AppearancePreference,
      showDiscoverMap: true,
      setAppearance: (appearance) => set({ appearance }),
      setShowDiscoverMap: (showDiscoverMap) => set({ showDiscoverMap }),
    }),
    {
      name: 'carepair-ui-prefs-v1',
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): PersistedSlice => ({
        appearance: s.appearance,
        showDiscoverMap: s.showDiscoverMap,
      }),
      /**
       * One-time: v1 had default `system` — migrate those (and unknown values) to `light`.
       * User-chosen Dark / Light / System after v2 is stored as-is.
       */
      migrate: async (persisted, fromVersion) => {
        if (fromVersion < 2) {
          const p = persisted as Partial<PersistedSlice> | null | undefined;
          const a = p?.appearance;
          const appearance: AppearancePreference =
            a === 'dark' ? 'dark' : a === 'light' ? 'light' : a === 'system' ? 'light' : 'light';
          return {
            appearance,
            showDiscoverMap: typeof p?.showDiscoverMap === 'boolean' ? p.showDiscoverMap : true,
          };
        }
        return persisted as PersistedSlice;
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<PersistedSlice> | null | undefined;
        if (!p || typeof p !== 'object') {
          return current;
        }
        return {
          ...current,
          appearance: coerceAppearance(p.appearance),
          showDiscoverMap: typeof p.showDiscoverMap === 'boolean' ? p.showDiscoverMap : current.showDiscoverMap,
        };
      },
    },
  ),
);
