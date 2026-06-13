import { create } from "zustand";

export interface Store {
  store_id: string;
  name: string;
  address?: string;
  lat?: number;
  lon?: number;
  capacity?: number;
  crowrd_level?: number;
}

interface AuthState {
  token: string | null;
  userId: string | null;
  userName: string | null;
  stores: Store[];
  activeStoreId: string | null;
  setAuth: (token: string, userId: string, userName: string) => void;
  setStores: (stores: Store[]) => void;
  addStore: (store: Store) => void;
  updateStoreInList: (store: Store) => void;
  setActiveStore: (storeId: string) => void;
  logout: () => void;
  // 後方互換ヘルパー
  storeId: string | null;
  storeName: string | null;
  setStore: (storeId: string, storeName: string) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  userId: null,
  userName: null,
  stores: [],
  activeStoreId: null,

  setAuth: (token, userId, userName) => set({ token, userId, userName }),

  setStores: (stores) => set((s) => ({
    stores,
    activeStoreId: s.activeStoreId ?? stores[0]?.store_id ?? null,
  })),

  addStore: (store) => set((s) => ({
    stores: [...s.stores, store],
    activeStoreId: s.activeStoreId ?? store.store_id,
  })),

  updateStoreInList: (store) => set((s) => ({
    stores: s.stores.map((x) => x.store_id === store.store_id ? { ...x, ...store } : x),
  })),

  setActiveStore: (storeId) => set({ activeStoreId: storeId }),

  logout: () => set({
    token: null, userId: null, userName: null,
    stores: [], activeStoreId: null,
  }),

  // 後方互換: 他ページが使う storeId / storeName / setStore
  get storeId() { return get().activeStoreId; },
  get storeName() {
    const s = get();
    return s.stores.find((x) => x.store_id === s.activeStoreId)?.name ?? null;
  },
  setStore: (storeId, storeName) => set((s) => {
    const exists = s.stores.find((x) => x.store_id === storeId);
    if (exists) return { activeStoreId: storeId };
    return { activeStoreId: storeId, stores: [...s.stores, { store_id: storeId, name: storeName }] };
  }),
}));
