# アーキテクチャ

## システム構成

```
[ブラウザ]
    │
    ▼
[Vercel]  Next.js 15 (App Router)
    │  NEXT_PUBLIC_API_URL
    │  HTTPリクエスト
    ▼
[Railway]  FastAPI + uvicorn
    │  DATABASE_URL
    │  asyncpg（非同期）
    ▼
[Supabase]  PostgreSQL 16
```

## ローカル開発構成（Docker Compose）

```
docker-compose up
├── frontend  (next dev)      → http://localhost:3000
├── backend   (uvicorn --reload) → http://localhost:8000
├── db        (postgres:16)   → localhost:5432
└── adminer                   → http://localhost:8080
```

本番と同じ構成をローカルで再現。`backend/.env` / `frontend/.env.local` で環境を切り替える。

---

## 技術選定理由

| 技術 | 選定理由 |
|------|---------|
| **FastAPI** | 型安全・非同期対応・OpenAPI自動生成・Pythonエコシステム |
| **Next.js 15 (App Router)** | RSC/SSR対応・Vercelとの親和性・TypeScript完全対応 |
| **SQLAlchemy 2.x (async)** | 非同期ORM・型安全・マイグレーション（Alembic）が使える |
| **asyncpg** | PostgreSQL向け最速の非同期ドライバ |
| **uv** | Rustで書かれた超高速Pythonパッケージマネージャ（pipの10〜100倍） |
| **Tailwind CSS 4** | ユーティリティファースト・設定不要で即使える |
| **Supabase** | PostgreSQL互換・RLS・認証・ストレージが統合・無料枠あり |
| **Railway** | DockerfileをそのままデプロイできるPaaS・移植性が高い |
| **Vercel** | Next.jsのファーストパーティホスティング・エッジ配信 |

---

## バックエンド構成

```
backend/app/
├── main.py       # FastAPIアプリ本体・CORS・ルーター登録
├── config.py     # pydantic-settingsで環境変数を型安全に管理
├── database.py   # SQLAlchemy非同期エンジン・セッション・Baseクラス
├── routers/      # エンドポイント（ファイル単位で機能分割）
│   ├── health.py     # GET /health
│   └── (追加予定)
└── models/       # SQLAlchemyモデル（テーブル定義）
    └── (追加予定)
```

### リクエストの流れ

```
HTTPリクエスト
    → main.py (CORSチェック)
    → routers/xxx.py (エンドポイント処理)
    → models/ + database.py (DB操作)
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
    └── api.ts        # バックエンドAPIクライアント（全APIコール集約）
```

### データ取得の方針

| 種別 | 方法 |
|------|------|
| サーバーサイドデータ取得 | Server Component（デフォルト）でfetch |
| クライアントインタラクション | `"use client"` + `useEffect` / Server Actions |
| API呼び出し | `src/lib/api.ts` の関数を使う |

---

## CORS設定

`ALLOWED_ORIGINS` 環境変数でカンマ区切りの複数オリジンを許可。

```env
# ローカル
ALLOWED_ORIGINS=http://localhost:3000

# 本番（複数指定も可）
ALLOWED_ORIGINS=https://your-app.vercel.app,https://custom-domain.com
```

---

## 認証（将来拡張）

Supabaseの認証機能（Auth）を使う想定:
- フロント: `@supabase/supabase-js`
- バック: JWTトークン検証（FastAPIのDependsで実装）
