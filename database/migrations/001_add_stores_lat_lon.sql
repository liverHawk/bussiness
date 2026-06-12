-- ============================================================
-- 001: stores テーブルに位置情報（lat / lon）を追加
-- 対象: schema.sql 初版で構築済みの DB
-- 実行方法: Supabase Dashboard → SQL Editor → 貼り付けて Run
-- （ローカル: docker-compose exec -T db psql -U postgres -d app_db < database/migrations/001_add_stores_lat_lon.sql）
-- ============================================================

ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION CHECK (lat >= -90.0  AND lat <= 90.0),
    ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION CHECK (lon >= -180.0 AND lon <= 180.0);

COMMENT ON COLUMN stores.lat IS '緯度（地図ピン表示用）';
COMMENT ON COLUMN stores.lon IS '経度（地図ピン表示用）';
