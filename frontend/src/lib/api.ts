const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// ---- スポット絞り込み検索 (GET /spots/search) ----

export interface Spot {
  spotId: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  congestionStatus: string;
  reviewRating: number;
}

interface SpotSearchResponse {
  spots: Spot[];
}

export interface SpotSearchFilters {
  congestion: string[];
  genres: string[];
  reviews: string[];
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function buildSearchQuery(filters: SpotSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  filters.congestion.forEach((v) => params.append("congestion", v));
  filters.genres.forEach((v) => params.append("genre", v));
  filters.reviews.forEach((v) => params.append("review", v));
  return params;
}

export async function searchSpots(
  filters: SpotSearchFilters
): Promise<Spot[]> {
  const token = getAccessToken();
  const query = buildSearchQuery(filters).toString();
  const res = await fetch(`${API_URL}/spots/search?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`スポット検索に失敗しました (${res.status})`);
  const data: SpotSearchResponse = await res.json();
  return data.spots;
}

// ---- コイン購入 (POST /billing/coins/purchase) ----

export interface CoinPurchaseResponse {
  paymentId: string;
  coinAmount: number;
  amountInYen: number;
  stripeCheckoutUrl: string;
}

export async function purchaseCoins(
  coinAmount: number
): Promise<CoinPurchaseResponse> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/billing/coins/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ coinAmount }),
  });
  if (!res.ok) {
    let message = `購入手続きに失敗しました (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  return res.json();
}
