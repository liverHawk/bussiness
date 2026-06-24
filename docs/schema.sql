-- 58 in OMU — Supabase スキーマ初期化 SQL
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行してください

-- ① users
CREATE TABLE IF NOT EXISTS users (
    user_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type       VARCHAR(10) NOT NULL,
    name       VARCHAR(50) NOT NULL,
    e_mail     VARCHAR(100) NOT NULL UNIQUE,
    pwd_hash   VARCHAR(64) NOT NULL,
    coin       INTEGER     NOT NULL DEFAULT 0,
    notice     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ② stores（スポット / マップピン）
CREATE TABLE IF NOT EXISTS stores (
    store_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner       UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name        VARCHAR(50) NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    crowrd_level FLOAT,
    lat         FLOAT,
    lon         FLOAT
);

-- ③ tags
CREATE TABLE IF NOT EXISTS tags (
    tag_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL,
    description TEXT
);

-- ④ store_tags（中間テーブル）
CREATE TABLE IF NOT EXISTS store_tags (
    store UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    tag   UUID NOT NULL REFERENCES tags(tag_id)    ON DELETE CASCADE,
    PRIMARY KEY (store, tag)
);

-- ⑤ reviews
CREATE TABLE IF NOT EXISTS reviews (
    review_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store     UUID        NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    post_user UUID        NOT NULL REFERENCES users(user_id)  ON DELETE CASCADE,
    rating    FLOAT,
    content   TEXT        NOT NULL DEFAULT '',
    photo_url VARCHAR(1000)
);

-- ⑥ routes
CREATE TABLE IF NOT EXISTS routes (
    route_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "user"         UUID        NOT NULL,
    route_name     VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    start_datetime TIMESTAMPTZ,
    goal_datetime  TIMESTAMPTZ
);

-- ⑦ route_points（中間テーブル）
CREATE TABLE IF NOT EXISTS route_points (
    route UUID NOT NULL,
    store UUID NOT NULL,
    PRIMARY KEY (route, store)
);

-- ⑧ coupons
CREATE TABLE IF NOT EXISTS coupons (
    coupon_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store          UUID        NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    title          VARCHAR(100) NOT NULL,
    description    TEXT,
    qr_code_url    VARCHAR(1000) NOT NULL DEFAULT '',
    expiry_date    DATE        NOT NULL,
    required_coins INTEGER     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ⑨ coupon_usages
CREATE TABLE IF NOT EXISTS coupon_usages (
    user_id   UUID NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    coupon    UUID NOT NULL REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    used_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, coupon)
);

-- ⑩ payments
CREATE TABLE IF NOT EXISTS payments (
    payment_id          VARCHAR(64)  PRIMARY KEY,
    user_id             UUID         NOT NULL,
    coin_amount         INTEGER      NOT NULL,
    amount_yen          INTEGER      NOT NULL,
    status              VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    stripe_checkout_url VARCHAR(1000),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- サンプルデータ（ピンを地図に表示するための最低限のデータ）
-- ─────────────────────────────────────────

-- システム用ユーザー（stores.owner の FK を満たすダミー）
INSERT INTO users (user_id, type, name, e_mail, pwd_hash)
VALUES ('00000000-0000-0000-0000-000000000001', 'Store', 'System', 'system@58inomu.local', repeat('0', 64))
ON CONFLICT DO NOTHING;

-- タグ（ジャンル）
INSERT INTO tags (tag_id, name) VALUES
    ('10000000-0000-0000-0000-000000000001', 'カフェ'),
    ('10000000-0000-0000-0000-000000000002', 'レストラン'),
    ('10000000-0000-0000-0000-000000000003', '寺院・神社・城'),
    ('10000000-0000-0000-0000-000000000004', '公園'),
    ('10000000-0000-0000-0000-000000000005', '美術館・博物館・ミュージアム')
ON CONFLICT DO NOTHING;

-- 天王寺周辺のサンプル店舗
INSERT INTO stores (store_id, owner, name, description, crowrd_level, lat, lon) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '四天王寺',         '聖徳太子建立の古刹',         0.3, 34.6549, 135.5157),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '天王寺公園',       '大阪市内の緑豊かな公園',     0.2, 34.6508, 135.5065),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '大阪市立美術館',   '天王寺公園内の美術館',       0.1, 34.6498, 135.5065),
    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'あべのハルカス',   '日本最高層ビル展望台・商業施設', 0.7, 34.6457, 135.5135),
    ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '通天閣カフェ',     '新世界エリアのカフェ',       0.5, 34.6524, 135.5063),
    ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '新世界レストラン', 'てっちり・串カツの名店',     0.6, 34.6524, 135.5063)
ON CONFLICT DO NOTHING;

-- 店舗タグ付け
INSERT INTO store_tags (store, tag) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'), -- 四天王寺 → 寺院
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004'), -- 天王寺公園 → 公園
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005'), -- 美術館
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001'), -- カフェ
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002')  -- レストラン
ON CONFLICT DO NOTHING;
