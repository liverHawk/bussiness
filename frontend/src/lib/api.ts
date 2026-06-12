const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("API error");
  return res.json();
}
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