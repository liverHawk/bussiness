import { create } from "zustand";

interface AuthState {
  token: string | null;
  userId: string | null;
  userName: string | null;
  storeId: string | null;
  storeName: string | null;
  setAuth: (token: string, userId: string, userName: string) => void;
  setStore: (storeId: string, storeName: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  userId: null,
  userName: null,
  storeId: null,
  storeName: null,
  setAuth: (token, userId, userName) => set({ token, userId, userName }),
  setStore: (storeId, storeName) => set({ storeId, storeName }),
  logout: () => set({ token: null, userId: null, userName: null, storeId: null, storeName: null }),
}));
