import { supabase } from "./supabase";

const AUTH_PWD_PLACEHOLDER = "0".repeat(64);

/** Supabase Auth ユーザーに対応する public.users 行を確保（stores.owner FK 用） */
async function ensurePublicUser(userId: string, name: string, email: string): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (existing) return;

  const { error } = await supabase.from("users").insert({
    user_id: userId,
    type: "Store",
    name: name.slice(0, 50),
    e_mail: email,
    pwd_hash: AUTH_PWD_PLACEHOLDER,
  });
  if (error) throw new Error(error.message);
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  const user = data.user!;
  const name = (user.user_metadata?.name as string) ?? email;
  await ensurePublicUser(user.id, name, email);
  return {
    accessToken: data.session!.access_token,
    user: { id: user.id, name },
  };
}

export async function register(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  if (data.user) {
    await ensurePublicUser(data.user.id, name, email);
  }
}

export async function logout() {
  await supabase.auth.signOut();
}

// ── Store ─────────────────────────────────────────────────────────────────
// 列名は schema.sql に準拠: PK=store_id, FK=owner, 混雑度=crowrd_level

export async function getMyStores(userId: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner", userId)
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
    .select("store_id, name, address, lat, lon, capacity, crowrd_level")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createStore(payload: {
  name: string; address: string; lat: number; lon: number; capacity: number; owner: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.id === payload.owner && user.email) {
    const name = (user.user_metadata?.name as string) ?? user.email;
    await ensurePublicUser(user.id, name, user.email);
  }

  const { data, error } = await supabase
    .from("stores")
    .insert({ ...payload, description: "" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateStore(storeId: string, payload: Partial<{
  name: string; address: string; lat: number; lon: number; capacity: number;
}>) {
  const { data, error } = await supabase
    .from("stores").update(payload).eq("store_id", storeId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCongestion(storeId: string, crowdLevel: number) {
  const { error } = await supabase
    .from("stores").update({ crowrd_level: crowdLevel }).eq("store_id", storeId);
  if (error) throw new Error(error.message);
}

// ── Products（merchandise）────────────────────────────────────────────────
// 列名は schema.sql に準拠: PK=merchandise_id, FK=store

export async function getProducts(storeId: string) {
  const { data, error } = await supabase
    .from("merchandise").select("*").eq("store", storeId).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProduct(storeId: string, payload: { name: string; price: number }) {
  const { data, error } = await supabase
    .from("merchandise").insert({ ...payload, store: storeId, describe: "" }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase.from("merchandise").delete().eq("merchandise_id", productId);
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
  discount_amount: number;        // 割引額（円）
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
      discount_amount: payload.discount_amount,
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
  coupon_id?: string | null;
}) {
  const ids = payload.items.map((i) => i.merchandise_id);
  const { data: products, error: pErr } = await supabase
    .from("merchandise").select("merchandise_id, price").in("merchandise_id", ids);
  if (pErr) throw new Error(pErr.message);

  const priceMap = Object.fromEntries(
    (products ?? []).map((p: any) => [p.merchandise_id, p.price])
  );
  let total = payload.items.reduce((s, i) => s + (priceMap[i.merchandise_id] ?? 0) * i.qty, 0);

  // クーポン適用（割引額を total から差し引く）
  if (payload.coupon_id) {
    const { data: coupon, error: cErr } = await supabase
      .from("coupons")
      .select("discount_amount, expiry_date")
      .eq("coupon_id", payload.coupon_id)
      .eq("store", payload.store_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!coupon) throw new Error("クーポンが見つかりません");
    if ((coupon as any).expiry_date && (coupon as any).expiry_date < new Date().toISOString().slice(0, 10)) {
      throw new Error("クーポンの有効期限が切れています");
    }
    total = Math.max(0, total - ((coupon as any).discount_amount ?? 0));

    // 使用記録を残す（重複時は無視）
    await supabase
      .from("coupon_usages")
      .upsert(
        { user_id: payload.user_id, coupon: payload.coupon_id },
        { onConflict: "user_id,coupon", ignoreDuplicates: true }
      );
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
