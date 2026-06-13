const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function req<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const login = (email: string, password: string) =>
  req<{ accessToken: string; user: { id: string; name: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ loginId: email, pwd_hash: password }) }
  );

export const register = (email: string, password: string, name: string) =>
  req("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, pwd_hash: password, name }),
  });

// Store
export const getMyStore = (token: string) =>
  req<any>("/stores/me", {}, token);

export const createStore = (token: string, data: object) =>
  req<any>("/stores", { method: "POST", body: JSON.stringify(data) }, token);

export const updateStore = (token: string, id: string, data: object) =>
  req<any>(`/stores/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token);

export const updateCongestion = (token: string, id: string, crowdLevel: number) =>
  req<any>(
    `/stores/${id}/congestion`,
    { method: "PATCH", body: JSON.stringify({ crowd_level: crowdLevel }) },
    token
  );

// Products
export const getProducts = (token: string, storeId: string) =>
  req<any[]>(`/stores/${storeId}/merchandise`, {}, token);

export const createProduct = (token: string, storeId: string, data: object) =>
  req<any>(`/stores/${storeId}/merchandise`, { method: "POST", body: JSON.stringify(data) }, token);

export const deleteProduct = (token: string, productId: string) =>
  req<void>(`/merchandise/${productId}`, { method: "DELETE" }, token);

// Coupons
export const getCoupons = (token: string, storeId: string) =>
  req<any[]>(`/stores/${storeId}/coupons`, {}, token);

export const createCoupon = (token: string, data: object) =>
  req<any>("/coupons", { method: "POST", body: JSON.stringify(data) }, token);

// Payment
export const processPayment = (token: string, data: object) =>
  req<any>("/payments", { method: "POST", body: JSON.stringify(data) }, token);
