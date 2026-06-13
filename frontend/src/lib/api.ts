const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---- トークン管理 ----

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function saveAccessToken(token: string): void {
  localStorage.setItem("accessToken", token);
}

export function clearAccessToken(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentUser");
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---- ヘルスチェック ----

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// ---- 認証 ----

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(loginId: string, pwdHash: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, pwd_hash: pwdHash }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "ログインに失敗しました");
  }
  return res.json();
}

export async function register(
  email: string,
  pwdHash: string,
  name: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pwd_hash: pwdHash, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "登録に失敗しました");
  }
  return res.json();
}

// ---- ユーザー ----

export interface MeResponse {
  userId: string;
  username: string;
  currentTotalCoins: number;
}

export async function getMe(): Promise<MeResponse> {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("ユーザー情報の取得に失敗しました");
  return res.json();
}

// ---- スポット検索 ----

export interface Spot {
  spotId: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  congestionStatus: string;
  reviewRating: number;
}

export interface SpotSearchFilters {
  congestion: string[];
  genres: string[];
  reviews: string[];
}

export async function searchSpots(filters: SpotSearchFilters): Promise<Spot[]> {
  const params = new URLSearchParams();
  filters.congestion.forEach((v) => params.append("congestion", v));
  filters.genres.forEach((v) => params.append("genre", v));
  filters.reviews.forEach((v) => params.append("review", v));
  const res = await fetch(`${API_URL}/spots/search?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`スポット検索に失敗しました (${res.status})`);
  const data: { spots: Spot[] } = await res.json();
  return data.spots;
}

// ---- スポット詳細 ----

export interface SpotDetail extends Spot {
  description: string;
}

export async function getSpotDetail(spotId: string): Promise<SpotDetail> {
  const res = await fetch(`${API_URL}/spots/${spotId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("スポット情報の取得に失敗しました");
  return res.json();
}

// ---- スポットレビュー ----

export interface SpotReview {
  reviewId: string;
  userName: string;
  rating: number;
  content: string;
  photoUrl: string | null;
}

export async function getSpotReviews(spotId: string): Promise<SpotReview[]> {
  const res = await fetch(`${API_URL}/spots/${spotId}/reviews`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("レビューの取得に失敗しました");
  const data: { reviews: SpotReview[] } = await res.json();
  return data.reviews;
}

// ---- ジオコーディング ----

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const res = await fetch(
    `${API_URL}/spots/geocode?q=${encodeURIComponent(query)}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(`"${query}" の場所が見つかりませんでした`);
  return res.json();
}

// ---- ルート ----

export interface RouteLocation {
  latitude: number;
  longitude: number;
}

export interface RouteGenerateRequest {
  startLocation: RouteLocation;
  destinations: RouteLocation[];
  specifiedDateTime: string; // ISO 8601
  timeType: "departure" | "arrival";
}

export interface TimelineEntry {
  sequence: number;
  locationName: string;
  actionLabel: string;
  estimatedHour: number;
  estimatedMinute: number;
  crowd: number | null;
  latitude: number;
  longitude: number;
}

export interface RouteGenerateResponse {
  routeId: string;
  totalDuration: number;
  totalDistance: number;
  timeline: TimelineEntry[];
  path: [number, number][];
}

export async function generateRoute(
  body: RouteGenerateRequest
): Promise<RouteGenerateResponse> {
  const res = await fetch(`${API_URL}/routes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "ルートの生成に失敗しました");
  }
  return res.json();
}

export interface SavedRoute {
  routeId: string;
  title: string;
  totalDays: number;
  createdAt: string;
  daysSummary: { day: number; label: string; spots: string[] }[];
}

export async function listRoutes(): Promise<SavedRoute[]> {
  const res = await fetch(`${API_URL}/routes`, { headers: authHeaders() });
  if (!res.ok) throw new Error("保存済みルートの取得に失敗しました");
  const data: { savedRoutes: SavedRoute[] } = await res.json();
  return data.savedRoutes;
}

// ---- クーポン ----

export type CouponItem = {
  couponId: string;
  title: string;
  qrCodeUrl: string;
  expiryDate: string;
  isUsed: boolean;
};

export async function fetchMyCoupons(token: string): Promise<CouponItem[]> {
  const res = await fetch(`${API_URL}/coupons/my-list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("クーポン一覧の取得に失敗しました");
  const data: { myCoupons: CouponItem[] } = await res.json();
  return data.myCoupons;
}

// ---- コイン購入 ----

export interface CoinPurchaseResponse {
  paymentId: string;
  coinAmount: number;
  amountInYen: number;
  stripeCheckoutUrl: string;
}

export async function purchaseCoins(
  coinAmount: number
): Promise<CoinPurchaseResponse> {
  const res = await fetch(`${API_URL}/billing/coins/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ coinAmount }),
  });
  if (!res.ok) {
    let message = `購入手続きに失敗しました (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}
