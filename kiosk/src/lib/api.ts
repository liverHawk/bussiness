import { supabase } from "./supabase";

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return {
    accessToken: data.session!.access_token,
    user: {
      id: data.user!.id,
      name: (data.user!.user_metadata?.name as string) ?? email,
    },
  };
}

export async function register(email: string, password: string, name: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
}

export async function logout() {
  await supabase.auth.signOut();
}

// ── Store ─────────────────────────────────────────────────────────────────

export async function getMyStore(userId: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createStore(payload: {
  name: string; address: string; lat: number; lon: number; capacity: number; owner_id: string;
}) {
  const { data, error } = await supabase.from("stores").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateStore(storeId: string, payload: Partial<{
  name: string; address: string; lat: number; lon: number; capacity: number;
}>) {
  const { data, error } = await supabase
    .from("stores").update(payload).eq("id", storeId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCongestion(storeId: string, crowdLevel: number) {
  const { error } = await supabase
    .from("stores").update({ crowd_level: crowdLevel }).eq("id", storeId);
  if (error) throw new Error(error.message);
}

// ── Products ──────────────────────────────────────────────────────────────

export async function getProducts(storeId: string) {
  const { data, error } = await supabase
    .from("merchandise").select("*").eq("store_id", storeId).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProduct(storeId: string, payload: { name: string; price: number }) {
  const { data, error } = await supabase
    .from("merchandise").insert({ ...payload, store_id: storeId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase.from("merchandise").delete().eq("id", productId);
  if (error) throw new Error(error.message);
}

// ── Coupons ───────────────────────────────────────────────────────────────

export async function getCoupons(storeId: string) {
  const { data, error } = await supabase
    .from("coupons").select("*").eq("store_id", storeId).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCoupon(payload: {
  store_id: string; code: string; discount_rate: number; expires_at?: string | null;
}) {
  const { data, error } = await supabase.from("coupons").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Payment (コイン決済) ───────────────────────────────────────────────────

export async function processPayment(payload: {
  user_id: string;
  store_id: string;
  items: { merchandise_id: string; qty: number }[];
  coupon_code?: string | null;
}) {
  const ids = payload.items.map((i) => i.merchandise_id);
  const { data: products, error: pErr } = await supabase
    .from("merchandise").select("id, price").in("id", ids);
  if (pErr) throw new Error(pErr.message);

  const priceMap = Object.fromEntries((products ?? []).map((p: any) => [p.id, p.price]));
  let total = payload.items.reduce((s, i) => s + (priceMap[i.merchandise_id] ?? 0) * i.qty, 0);

  // クーポン適用
  if (payload.coupon_code) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("discount_rate")
      .eq("store_id", payload.store_id)
      .eq("code", payload.coupon_code)
      .maybeSingle();
    if (coupon) total = Math.floor(total * (1 - (coupon as any).discount_rate));
  }

  // コイン残高確認・減算
  const { data: user, error: uErr } = await supabase
    .from("users").select("coin").eq("user_id", payload.user_id).single();
  if (uErr) throw new Error("ユーザーが見つかりません");
  if (((user as any).coin ?? 0) < total) throw new Error("コインが不足しています");

  const { error: coinErr } = await supabase
    .from("users").update({ coin: (user as any).coin - total }).eq("user_id", payload.user_id);
  if (coinErr) throw new Error(coinErr.message);

  return { total };
}
