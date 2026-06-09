# 58 in OMU — GitHub Copilot Instructions

## プロジェクト概要

FastAPI（Backend） × Next.js（Frontend） × Supabase（DB）のモノレポ。

- Frontend + Backend → **XServer VPS** 上の Docker コンテナ（同一サーバー）
- DB → **Supabase** (PostgreSQL)
- CI/CD → **GitHub Actions**（push で VPS へ自動デプロイ）
- 環境変数 → VPS 上に `.env` を直接配置（Git 管理外）

## ディレクトリ構成

```
/
├── backend/app/
│   ├── main.py       # FastAPI アプリ・CORS・ルーター登録
│   ├── config.py     # pydantic-settings で環境変数管理
│   ├── database.py   # SQLAlchemy 非同期エンジン・get_db
│   ├── routers/      # エンドポイント（ファイル単位で機能分割）
│   └── models/       # SQLAlchemy モデル
├── backend/tests/    # pytest
├── frontend/src/
│   ├── app/          # Next.js App Router（ファイル＝ページ）
│   └── lib/api.ts    # バックエンド API クライアント（ここに集約）
└── docker-compose.yml  # ローカル開発用
```

## ローカル開発

```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# Swagger:  http://localhost:8000/docs
```

## Backendのコーディングルール

- エンドポイントは `backend/app/routers/` にファイル単位で追加し、`main.py` で `include_router` する
- DBアクセスは `get_db` を `Depends()` で注入する
- 型ヒント必須・`async def` を使う
- テストは `backend/tests/` に `pytest` + `httpx` で書く

### エンドポイント追加パターン

```python
# backend/app/routers/items.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

router = APIRouter(prefix="/items", tags=["items"])

@router.get("/")
async def list_items(db: AsyncSession = Depends(get_db)):
    return []
```

```python
# backend/app/main.py に追記
from app.routers import items
app.include_router(items.router)
```

## Frontendのコーディングルール

- API呼び出しは必ず `frontend/src/lib/api.ts` に関数として定義する
- データ取得はServer Component（デフォルト）、インタラクションは `"use client"`
- `any` 型は使わない

### API追加パターン

```typescript
// frontend/src/lib/api.ts に追記
export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_URL}/items`);
  if (!res.ok) throw new Error("API error");
  return res.json();
}
```

## 環境変数

- Backend: `DATABASE_URL`, `ALLOWED_ORIGINS`
- Frontend: `NEXT_PUBLIC_API_URL`
- 本番の `.env` は VPS 上に直接配置（Git にコミットしない）

## デプロイ

- 本番: XServer VPS + Docker（frontend / backend 同一サーバー）
- DB: Supabase
- CI/CD: GitHub Actions → SSH → `docker compose up --build -d`
- 詳細: `docs/deployment.md`
