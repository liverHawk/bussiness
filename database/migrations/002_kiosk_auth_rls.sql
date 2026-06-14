-- ============================================================
-- 002: Kiosk（Supabase Auth）向け RLS ポリシー
-- 店舗登録が permission denied になる場合に Supabase SQL Editor で実行
-- ============================================================

ALTER TABLE users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- users: 自分の行のみ操作可
DROP POLICY IF EXISTS "kiosk_users_select_own" ON users;
CREATE POLICY "kiosk_users_select_own" ON users
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "kiosk_users_insert_own" ON users;
CREATE POLICY "kiosk_users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "kiosk_users_update_own" ON users;
CREATE POLICY "kiosk_users_update_own" ON users
  FOR UPDATE USING (auth.uid() = user_id);

-- stores: オーナーのみ作成・更新、一覧は全員閲覧可（地図表示用）
DROP POLICY IF EXISTS "kiosk_stores_select_all" ON stores;
CREATE POLICY "kiosk_stores_select_all" ON stores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "kiosk_stores_insert_own" ON stores;
CREATE POLICY "kiosk_stores_insert_own" ON stores
  FOR INSERT WITH CHECK (auth.uid() = owner);

DROP POLICY IF EXISTS "kiosk_stores_update_own" ON stores;
CREATE POLICY "kiosk_stores_update_own" ON stores
  FOR UPDATE USING (auth.uid() = owner);
