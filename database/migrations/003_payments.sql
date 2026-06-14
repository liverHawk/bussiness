-- ============================================================
-- 003: payments テーブル追加（コイン購入 / Stripe 決済用）
-- 実行方法: Supabase SQL Editor で Run
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id          VARCHAR(64)  PRIMARY KEY,
    user_id             UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    coin_amount         INTEGER      NOT NULL,
    amount_yen          INTEGER      NOT NULL,
    status              VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    stripe_checkout_url TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
