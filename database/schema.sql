-- ============================================================
-- 58hack in OMU — Supabase スキーマ定義
-- 実行方法: Supabase Dashboard → SQL Editor → このファイルを貼り付けて Run
-- ============================================================

-- UUID生成拡張（Supabaseはデフォルトで有効だが念のため）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- users（ユーザー / 店舗オーナー共用）
-- type = 'User' | 'Store' で種別を区別する
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(10)   NOT NULL CHECK (type IN ('User', 'Store')),
    e_mail      VARCHAR(100)  NOT NULL UNIQUE,
    pwd_hash    CHAR(64)      NOT NULL,
    coin        INTEGER       NOT NULL DEFAULT 0,
    notice      BOOLEAN       NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ============================================================
-- stores（店舗）
-- crowrd_level: 0.0（空いている）〜 1.0（混雑）
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
    store_id     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner        UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name         VARCHAR(50)  NOT NULL,
    description  TEXT         NOT NULL,
    crowrd_level FLOAT        CHECK (crowrd_level >= 0.0 AND crowrd_level <= 1.0),
    -- 地図表示用の位置情報（docs/map.md 参照）
    lat          DOUBLE PRECISION CHECK (lat >= -90.0  AND lat <= 90.0),
    lon          DOUBLE PRECISION CHECK (lon >= -180.0 AND lon <= 180.0)
);


-- ============================================================
-- tags（店舗カテゴリタグ）
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    tag_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  NOT NULL,
    description TEXT
);


-- ============================================================
-- store_tags（店舗 ↔ タグ 中間テーブル）
-- 1店舗に複数タグを付けられる
-- ============================================================
CREATE TABLE IF NOT EXISTS store_tags (
    store  UUID  NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    tag    UUID  NOT NULL REFERENCES tags(tag_id)     ON DELETE CASCADE,
    PRIMARY KEY (store, tag)
);


-- ============================================================
-- routes（ユーザーが生成したルート）
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
    route_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "user"          UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    route_name      VARCHAR(100)  NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    start_datetime  TIMESTAMPTZ,
    goal_datetime   TIMESTAMPTZ
);


-- ============================================================
-- route_points（ルートに含まれる店舗一覧）
-- 1ルートに複数店舗が含まれる
-- ============================================================
CREATE TABLE IF NOT EXISTS route_points (
    route  UUID  NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    store  UUID  NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    PRIMARY KEY (route, store)
);


-- ============================================================
-- merchandise（店舗の商品）
-- ============================================================
CREATE TABLE IF NOT EXISTS merchandise (
    merchandise_id  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    store           UUID         NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    name            VARCHAR(50)  NOT NULL,
    describe        TEXT         NOT NULL,
    price           INTEGER      NOT NULL
);


-- ============================================================
-- coupons（商品クーポン）
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
    coupon_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    merchandise      UUID         NOT NULL REFERENCES merchandise(merchandise_id) ON DELETE CASCADE,
    name             VARCHAR(50)  NOT NULL,
    describe         TEXT,
    discounted_price INTEGER      NOT NULL
);


-- ============================================================
-- reviews（店舗レビュー）
-- rating: 0.0〜5.0
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    review_id  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    store      UUID           NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    post_user  UUID           NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    rating     FLOAT          CHECK (rating >= 0.0 AND rating <= 5.0),
    content    TEXT           NOT NULL,
    photo_url  VARCHAR(1000)
);


-- ============================================================
-- インデックス（よく検索するカラムに貼る）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stores_owner        ON stores(owner);
CREATE INDEX IF NOT EXISTS idx_routes_user         ON routes("user");
CREATE INDEX IF NOT EXISTS idx_route_points_route  ON route_points(route);
CREATE INDEX IF NOT EXISTS idx_merchandise_store   ON merchandise(store);
CREATE INDEX IF NOT EXISTS idx_coupons_merchandise ON coupons(merchandise);
CREATE INDEX IF NOT EXISTS idx_reviews_store       ON reviews(store);
CREATE INDEX IF NOT EXISTS idx_store_tags_store    ON store_tags(store);


-- ============================================================
-- Row Level Security（RLS）
-- 現在は無効。認証実装後に有効化してポリシーを追加すること。
-- ============================================================
-- ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stores       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tags         ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE store_tags   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE routes       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE route_points ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE merchandise  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE coupons      ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reviews      ENABLE ROW LEVEL SECURITY;
