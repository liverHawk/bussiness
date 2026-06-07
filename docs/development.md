# 開発ガイド

AIアシスタント（Cursor / GitHub Copilot / Claude）と一緒に開発するための実践ガイド。

---

## 開発の始め方

```bash
# 起動
docker-compose up

# ファイルを編集するだけで自動リロードされる
# Backend: http://localhost:8000/docs でAPIを確認
# Frontend: http://localhost:3000 でUIを確認
```

---

## バックエンドに機能を追加する

### 新しいAPIエンドポイントを追加

**1. `backend/app/routers/` に新しいファイルを作成**

```python
# backend/app/routers/items.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

router = APIRouter(prefix="/items", tags=["items"])

@router.get("/")
async def list_items(db: AsyncSession = Depends(get_db)):
    return {"items": []}

@router.post("/")
async def create_item(db: AsyncSession = Depends(get_db)):
    return {"id": 1}
```

**2. `backend/app/main.py` に登録**

```python
from app.routers import items  # 追加
app.include_router(items.router)  # 追加
```

**3. http://localhost:8000/docs で確認**

### DBモデルを追加

```python
# backend/app/models/item.py
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Item(Base):
    __tablename__ = "items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
```

### Pydanticスキーマを使う（リクエスト/レスポンスの型定義）

```python
from pydantic import BaseModel

class ItemCreate(BaseModel):
    name: str
    description: str | None = None

class ItemResponse(BaseModel):
    id: int
    name: str

@router.post("/", response_model=ItemResponse)
async def create_item(body: ItemCreate, db: AsyncSession = Depends(get_db)):
    ...
```

### 依存パッケージを追加する

`backend/pyproject.toml` の `dependencies` に追記してリビルド:

```bash
docker-compose up --build backend
```

---

## フロントエンドに機能を追加する

### 新しいページを追加

```
frontend/src/app/about/page.tsx  →  http://localhost:3000/about
frontend/src/app/items/page.tsx  →  http://localhost:3000/items
```

### APIを呼ぶ関数を追加

```typescript
// frontend/src/lib/api.ts に追記
export type Item = {
  id: number;
  name: string;
};

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_URL}/items`);
  if (!res.ok) throw new Error("Failed to fetch items");
  return res.json();
}
```

### Server Componentでデータ取得（推奨）

```tsx
// frontend/src/app/items/page.tsx
import { fetchItems } from "@/lib/api";

export default async function ItemsPage() {
  const items = await fetchItems();
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### Client Componentでインタラクション

```tsx
"use client";
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### 依存パッケージを追加する

`frontend/package.json` に追記してリビルド:

```bash
docker-compose up --build frontend
```

---

## テストを書く

### Backend（pytest）

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
    assert "items" in response.json()
```

```bash
# 実行
docker-compose exec backend uv run pytest
docker-compose exec backend uv run pytest -v -s  # 詳細＋print表示
```

---

## Git運用

```bash
# 機能ブランチを作って作業
git checkout -b feature/add-items-api

# こまめにコミット
git add .
git commit -m "feat: アイテム一覧APIを追加"

# PRを作ってmainにマージ
# → GitHub ActionsでCIが自動実行される
```

### コミットメッセージの規約（推奨）

| プレフィックス | 用途 |
|------------|------|
| `feat:` | 新機能 |
| `fix:` | バグ修正 |
| `docs:` | ドキュメント |
| `refactor:` | リファクタリング |
| `test:` | テスト追加・修正 |

---

## AIアシスタントとの開発Tips

### Cursorを使う場合
- `.cursor/rules/project.mdc` にプロジェクトルールが設定済み
- 自動で読み込まれるので追加設定不要

### Claudeを使う場合
- `CLAUDE.md` にコンテキストが記載済み
- 「このプロジェクトのCLAUDE.mdを読んで」と伝えると素早く把握してもらえる

### 指示の出し方の例
```
「/items エンドポイントを追加して。DBからItemを全件取得して返す。
 backend/app/routers/items.py を作って main.py に登録して」

「frontend の /items ページを追加して。
 APIからアイテム一覧を取得してカード形式で表示して」
```
