# 58 in OMU — AI開発コンテキスト

このファイルはClaude / Cursor / GitHub CopilotなどのAIアシスタントが
プロジェクトを理解するためのコンテキストファイルです。

---

## プロジェクト概要

FastAPI（Backend） × Next.js（Frontend） × Supabase（DB）のモノレポ。
- Backend → Railway にデプロイ
- Frontend → Vercel にデプロイ
- DB → Supabase (PostgreSQL)

---

## ディレクトリ構成

```
/
├── backend/              # Python FastAPI
│   ├── app/
│   │   ├── main.py       # FastAPIアプリ本体・ミドルウェア設定
│   │   ├── config.py     # 環境変数（pydantic-settings）
│   │   ├── database.py   # SQLAlchemy非同期エンジン・セッション
│   │   ├── routers/      # エンドポイント（ファイル＝機能単位）
│   │   └── models/       # SQLAlchemyモデル
│   ├── tests/            # pytest
│   ├── pyproject.toml    # 依存管理（uv）
│   └── Dockerfile
├── frontend/             # Next.js 15 App Router
│   ├── src/
│   │   ├── app/          # ページ・レイアウト（App Router）
│   │   └── lib/
│   │       └── api.ts    # バックエンドAPIクライアント
│   └── Dockerfile
├── docs/                 # ドキュメント
├── docker-compose.yml    # ローカル開発（全サービス一括起動）
└── CLAUDE.md             # このファイル
```

---

## 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| Backend言語 | Python | 3.12 |
| BackendFW | FastAPI + uvicorn | latest |
| ORM | SQLAlchemy 2.x (async) | 2.x |
| DBドライバ | asyncpg | latest |
| パッケージ管理 | uv | latest |
| Frontend | Next.js (App Router) | 15 |
| Frontend言語 | TypeScript | 5 |
| スタイル | Tailwind CSS | 4 |
| DB | PostgreSQL | 16 |

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
| Adminer | http://localhost:8080 | DB管理UI |

ファイルを保存するとbackend/frontendともに**自動リロード**される。

---

## 環境変数

### backend/.env
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/app_db
ALLOWED_ORIGINS=http://localhost:3000
```

### frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
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
    # db を使ってクエリ
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
- APIクライアントは `src/lib/api.ts` に集約する

---

## テスト

```bash
# Backend
docker-compose exec backend uv run pytest
docker-compose exec backend uv run pytest -v          # 詳細表示
docker-compose exec backend uv run pytest tests/test_health.py  # 特定ファイル

# Frontend
docker-compose exec frontend npm run lint
```

---

## デプロイ

詳細は [docs/deployment.md](docs/deployment.md) を参照。

### 概要
1. **Supabase** でDBを作成し、接続文字列を取得
2. **Railway** にbackendをデプロイ（環境変数にSupabaseの接続文字列を設定）
3. **Vercel** にfrontendをデプロイ（環境変数にRailwayのURLを設定）
4. RailwayのCORSにVercelのURLを追加

### 本番環境変数

**Railway (Backend)**
```env
DATABASE_URL=postgresql+asyncpg://...  # Supabaseの接続文字列
ALLOWED_ORIGINS=https://your-app.vercel.app
```

**Vercel (Frontend)**
```env
NEXT_PUBLIC_API_URL=https://your-app.railway.app
```
