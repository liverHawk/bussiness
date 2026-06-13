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

export async function getMyStores(userId: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** 後方互換 */
export async function getMyStore(userId: string) {
  const list = await getMyStores(userId);
  return list[0] ?? null;
}

export async function getAllStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, address, lat, lon, capacity, crowd_level")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
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
    .from("coupons").select("*").eq("store", storeId).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCoupon(payload: {
  store_id: string;
  title: string;
  description?: string | null;
  expiry_date: string;            // YYYY-MM-DD
  required_coins: number;
  qr_code_url?: string | null;    // 未指定なら coupon_id から自動生成
}) {
  // 1. まず挿入（qr_code_url は後で coupon_id ベースに更新する）
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      store: payload.store_id,
      title: payload.title,
      description: payload.description ?? null,
      expiry_date: payload.expiry_date,
      required_coins: payload.required_coins,
      qr_code_url: payload.qr_code_url || "pending",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // 2. QR 未指定なら coupon_id を埋め込んだ実 QR コード URL を生成して更新
  if (!payload.qr_code_url) {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${data.coupon_id}`;
    const { data: updated, error: uErr } = await supabase
      .from("coupons").update({ qr_code_url: qr }).eq("coupon_id", data.coupon_id).select().single();
    if (uErr) throw new Error(uErr.message);
    return updated;
  }
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
