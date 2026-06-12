-- ============================================================
-- 002: users テーブルに name（表示名）を追加
-- 対象: schema.sql 初版〜001 で構築済みの DB
-- 実行方法: Supabase Dashboard → SQL Editor → 貼り付けて Run
-- （ローカル: docker-compose exec -T db psql -U postgres -d app_db < database/migrations/002_add_users_name.sql）
-- ============================================================

-- 既存行があっても通るように DEFAULT '' 付きで追加
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name VARCHAR(50) NOT NULL DEFAULT '';

COMMENT ON COLUMN users.name IS 'ユーザー表示名（店舗オーナーの場合は担当者名など）';
