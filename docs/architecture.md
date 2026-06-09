# アーキテクチャ

## システム構成（本番）

```
[ブラウザ]
    │
    ▼ HTTPS
[XServer VPS]
├── Nginx（リバースプロキシ）
├── Docker: frontend（Next.js 15）
├── Docker: backend（FastAPI + uvicorn）
├── backend/.env        ← VPS 上に直接配置
└── frontend/.env.local ← VPS 上に直接配置
    │
    │ DATABASE_URL（asyncpg）
    ▼
[Supabase]  PostgreSQL 16
```

Frontend と Backend は **同一 VPS 内の Docker コンテナ** として動作する。  
DB のみ Supabase（外部マネージド PostgreSQL）を利用する。

GitHub リポジトリが更新されると、GitHub Actions 経由で VPS に SSH 接続し、Docker イメージを再ビルド・再デプロイする。

---

## ローカル開発構成（Docker Compose）

```
docker-compose up
├── frontend  (next dev)         → http://localhost:3000
├── backend   (uvicorn --reload) → http://localhost:8000
├── db        (postgres:16)      → localhost:5432
└── adminer                    → http://localhost:8080
```

ローカルでは PostgreSQL コンテナを使い、本番の Supabase とは切り離す。  
`backend/.env` / `frontend/.env.local` で環境を切り替える。

---

## 技術選定理由

| 技術 | 選定理由 |
|------|---------|
| **FastAPI** | 型安全・非同期対応・OpenAPI 自動生成・Python エコシステム |
| **Next.js 15 (App Router)** | RSC/SSR 対応・TypeScript 完全対応・Docker デプロイ可能 |
| **SQLAlchemy 2.x (async)** | 非同期 ORM・型安全・マイグレーション（Alembic）が使える |
| **asyncpg** | PostgreSQL 向け最速の非同期ドライバ |
| **uv** | Rust で書かれた超高速 Python パッケージマネージャ |
| **Tailwind CSS 4** | ユーティリティファースト・設定不要で即使える |
| **Supabase** | PostgreSQL 互換・RLS・認証・ストレージが統合・無料枠あり |
| **XServer VPS** | フロント・バックを同一サーバーで運用でき、コストを抑えられる |
| **Docker** | ローカルと本番の環境差を最小化・再現性が高い |
| **GitHub Actions** | push トリガーで CI/CD を自動化 |

---

## バックエンド構成

```
backend/app/
├── main.py       # FastAPI アプリ本体・CORS・ルーター登録
├── config.py     # pydantic-settings で環境変数を型安全に管理
├── database.py   # SQLAlchemy 非同期エンジン・セッション・Base クラス
├── routers/      # エンドポイント（ファイル単位で機能分割）
│   ├── health.py     # GET /health
│   └── (追加予定)
└── models/       # SQLAlchemy モデル（テーブル定義）
    └── (追加予定)
```

### リクエストの流れ

```
HTTP リクエスト
    → Nginx（本番のみ）
    → main.py (CORS チェック)
    → routers/xxx.py (エンドポイント処理)
    → models/ + database.py (DB 操作 → Supabase)
    → レスポンス返却
```

---

## フロントエンド構成

```
frontend/src/
├── app/              # App Router（ファイル＝ページ）
│   ├── layout.tsx    # 共通レイアウト
│   ├── page.tsx      # トップページ
│   └── globals.css   # グローバルスタイル
└── lib/
    └── api.ts        # バックエンド API クライアント（全 API コール集約）
```

### データ取得の方針

| 種別 | 方法 |
|------|------|
| サーバーサイドデータ取得 | Server Component（デフォルト）で fetch |
| クライアントインタラクション | `"use client"` + `useEffect` / Server Actions |
| API 呼び出し | `src/lib/api.ts` の関数を使う |

---

## CORS 設定

`ALLOWED_ORIGINS` 環境変数でカンマ区切りの複数オリジンを許可。

```env
# ローカル
ALLOWED_ORIGINS=http://localhost:3000

# 本番（VPS + 同一ドメイン）
ALLOWED_ORIGINS=https://your-domain.com
```

同一 VPS・同一ドメインで Nginx が振り分ける構成では、フロントからバックへのリクエストは同一オリジンになるため CORS の影響は小さい。ただし `ALLOWED_ORIGINS` は本番ドメインを設定しておく。

---

## 認証（将来拡張）

Supabase の認証機能（Auth）を使う想定:

- フロント: `@supabase/supabase-js`
- バック: JWT トークン検証（FastAPI の Depends で実装）
