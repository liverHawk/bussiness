# 58 in OMU — AI開発コンテキスト

このファイルは Claude / Cursor / GitHub Copilot などの AI アシスタントが
プロジェクトを理解するためのコンテキストファイルです。

---

## プロジェクト概要

FastAPI（Backend） × Next.js（Frontend） × Supabase（DB）のモノレポ。

- Frontend + Backend → **XServer VPS** 上の Docker コンテナ（同一サーバー）
- DB → **Supabase** (PostgreSQL)
- CI/CD → **GitHub Actions**（`main` への push で VPS へ自動デプロイ）
- 環境変数 → VPS 上に `.env` を直接配置（Git 管理外）

---

## ディレクトリ構成

```
/
├── backend/              # Python FastAPI
│   ├── app/
│   │   ├── main.py       # FastAPI アプリ本体・ミドルウェア設定
│   │   ├── config.py     # 環境変数（pydantic-settings）
│   │   ├── database.py   # SQLAlchemy 非同期エンジン・セッション
│   │   ├── routers/      # エンドポイント（ファイル＝機能単位）
│   │   └── models/       # SQLAlchemy モデル
│   ├── tests/            # pytest
│   ├── pyproject.toml    # 依存管理（uv）
│   └── Dockerfile
├── frontend/             # Next.js 15 App Router
│   ├── src/
│   │   ├── app/          # ページ・レイアウト（App Router）
│   │   └── lib/
│   │       └── api.ts    # バックエンド API クライアント
│   └── Dockerfile
├── docs/                 # ドキュメント
├── docker-compose.yml    # ローカル開発（DB コンテナ含む）
└── CLAUDE.md             # このファイル
```

---

## 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| Backend 言語 | Python | 3.12 |
| Backend FW | FastAPI + uvicorn | latest |
| ORM | SQLAlchemy 2.x (async) | 2.x |
| DB ドライバ | asyncpg | latest |
| パッケージ管理 | uv | latest |
| Frontend | Next.js (App Router) | 15 |
| Frontend 言語 | TypeScript | 5 |
| スタイル | Tailwind CSS | 4 |
| DB | PostgreSQL (Supabase) | 16 |
| 本番ホスト | XServer VPS + Docker | — |
| CI/CD | GitHub Actions | — |

---

## ローカル開発（Docker）

```bash
# 初回セットアップ
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
docker-compose up --build

# 2回目以降
docker-compose up
```

| サービス | URL | 説明 |
|---------|-----|------|
| Frontend | http://localhost:3000 | Next.js |
| Backend | http://localhost:8000 | FastAPI |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Adminer | http://localhost:8080 | DB 管理 UI（ローカルのみ） |

ファイルを保存すると backend / frontend ともに**自動リロード**される。

---

## 環境変数

### ローカル: backend/.env

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/app_db
ALLOWED_ORIGINS=http://localhost:3000
```

### ローカル: frontend/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 本番: VPS 上に直接配置

```env
# backend/.env
DATABASE_URL=postgresql+asyncpg://...  # Supabase の接続文字列
ALLOWED_ORIGINS=https://your-domain.com

# frontend/.env.local
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

## バックエンド開発パターン

### 新しいエンドポイントを追加する

1. `backend/app/routers/` に新しいファイルを作成
2. `backend/app/main.py` で `include_router` する

```python
# backend/app/routers/items.py
from fastapi import APIRouter

router = APIRouter(prefix="/items", tags=["items"])

@router.get("/")
async def list_items():
    return []
```

```python
# backend/app/main.py に追記
from app.routers import items
app.include_router(items.router)
```

### DBアクセスを伴うエンドポイント

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

router = APIRouter()

@router.get("/items")
async def list_items(db: AsyncSession = Depends(get_db)):
  ...
```

### SQLAlchemyモデルを追加する

```python
# backend/app/models/item.py
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Item(Base):
    __tablename__ = "items"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
```

### テストを書く

```python
# backend/tests/test_items.py
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_list_items():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/items")
    assert response.status_code == 200
```

テスト実行:

```bash
docker-compose exec backend uv run pytest
```

---

## フロントエンド開発パターン

### 新しいページを追加する

```
frontend/src/app/about/page.tsx  →  http://localhost:3000/about
```

### バックエンドAPIを呼ぶ

```typescript
// frontend/src/lib/api.ts に関数を追加
export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_URL}/items`);
  if (!res.ok) throw new Error("API error");
  return res.json();
}
```

### Server Component vs Client Component

- データ取得は**Server Component**（デフォルト）で行う
- インタラクション（useState, useEffect, onClick）は `"use client"` を先頭に付ける

---

## コーディング規約

### Backend

- 関数・変数名は `snake_case`
- 型ヒントを必ず付ける
- 非同期関数は `async def`
- ルーターはファイル単位で機能を分離する

### Frontend

- コンポーネント名は `PascalCase`
- ファイル名は `kebab-case` または `camelCase`
- `any` 型は使わない
- API クライアントは `src/lib/api.ts` に集約する

---

## テスト

```bash
# Backend
docker-compose exec backend uv run pytest
docker-compose exec backend uv run pytest -v
docker-compose exec backend uv run pytest tests/test_health.py

# Frontend
docker-compose exec frontend npm run lint
```

---

## デプロイ

詳細は [docs/deployment.md](docs/deployment.md) を参照。

### 概要

1. **Supabase** で DB を作成し、接続文字列を取得
2. **XServer VPS** に Docker をインストールし、リポジトリを clone
3. VPS 上に `backend/.env` / `frontend/.env.local` を直接配置
4. `docker compose -f docker-compose.prod.yml up --build -d` で初回デプロイ
5. **GitHub Actions** で `main` への push 時に VPS へ SSH デプロイを自動化

### 本番環境変数（VPS 上）

```env
# backend/.env
DATABASE_URL=postgresql+asyncpg://...
ALLOWED_ORIGINS=https://your-domain.com

# frontend/.env.local
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```
