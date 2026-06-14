# 地図・ルート検索 仕様（OpenStreetMap）

マップ表示とルート検索は **OpenStreetMap（OSM）** をベースに構築する。
Google Maps 等の有料 API は使わない（API キー不要・無料で動かせる構成にする）。

---

## 全体構成

```
[ブラウザ]
 ├── 地図タイル表示     → OSM タイルサーバーから直接取得（Leaflet）
 ├── 店舗ピン・混雑表示  → backend API（stores テーブル）から取得して地図に重ねる
 └── ルート検索リクエスト → backend API 経由
                              │
                       [FastAPI backend]
                        ├── ジオコーディング → Nominatim（住所・地名 → 緯度経度）
                        ├── 経路計算        → OSRM（緯度経度の組 → ルート）
                        └── 混雑データ      → Supabase（stores.crowrd_level）
                              │
                              ▼
                        混雑を避けたおすすめルートを生成して返す
```

---

## 使用する OSS / 外部サービス

| 役割 | 技術 | 備考 |
|------|------|------|
| 地図表示ライブラリ | **Leaflet + react-leaflet** | デファクト。軽量で情報が多い |
| 地図タイル | **OSM 標準タイル** (`tile.openstreetmap.org`) | 無料・帰属表示必須 |
| ジオコーディング | **Nominatim** (`nominatim.openstreetmap.org`) | 地名・住所 → 緯度経度 |
| 経路計算 | **OSRM デモサーバー** (`router.project-osrm.org`) | 徒歩・車・自転車ルート |

### 利用ポリシー（重要・必読）

外部の無料サーバーを使うため、以下のルールを必ず守ること。

| サービス | 制限 |
|---------|------|
| OSM タイル | 帰属表示 `© OpenStreetMap contributors` を必ず地図上に表示する。大量プリフェッチ禁止 |
| Nominatim | **1リクエスト/秒まで**。連続呼び出しするときは間隔を空ける。検索のたびに叩かずに結果を DB にキャッシュする |
| OSRM デモ | 開発・デモ用途のみ。本番で大量アクセスする場合は自前ホスト（Docker で OSRM を立てる）を検討 |

---

## フロントエンド実装ルール

### パッケージ

```bash
# frontend/package.json に追加
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### 地図コンポーネントは必ず Client Component + dynamic import

Leaflet は `window` に依存するため **SSR では動かない**。
次のパターンを必ず使うこと:

```tsx
// frontend/src/app/map/page.tsx
import dynamic from "next/dynamic";

// ssr: false が必須（Leaflet は SSR 不可）
const Map = dynamic(() => import("@/components/map"), { ssr: false });

export default function MapPage() {
  return <Map />;
}
```

```tsx
// frontend/src/components/map.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Map() {
  return (
    <MapContainer
      center={[34.5446, 135.5064]} // 大阪公立大学 杉本キャンパス周辺
      zoom={15}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* 店舗ピンはここに Marker で追加 */}
    </MapContainer>
  );
}
```

### ルート（線）の描画

OSRM が返す GeoJSON（座標列）を `Polyline` で描画する:

```tsx
import { Polyline } from "react-leaflet";

<Polyline positions={routeCoordinates} color="blue" />
```

---

## バックエンド実装ルール

ルート検索は**フロントから直接 OSRM を叩かず、必ず backend を経由**する。
（混雑データと組み合わせるロジックを backend に集約するため）

### エンドポイント設計（想定）

| エンドポイント | 内容 |
|--------------|------|
| `GET /stores` | 店舗一覧（緯度経度・混雑度つき）→ 地図のピン表示用 |
| `POST /routes/generate` | 出発地・目的地・希望条件を受け取り、混雑を避けたルートを生成 |
| `GET /geocode?q=地名` | Nominatim を呼んで緯度経度を返す（プロキシ） |

### OSRM の呼び出し例（backend）

```python
import httpx

OSRM_BASE = "https://router.project-osrm.org"

async def fetch_route(
    start_lon: float, start_lat: float,
    end_lon: float, end_lat: float,
) -> dict:
    """徒歩ルートを取得する。profile は foot / car / bike"""
    url = f"{OSRM_BASE}/route/v1/foot/{start_lon},{start_lat};{end_lon},{end_lat}"
    params = {"overview": "full", "geometries": "geojson"}
    async with httpx.AsyncClient() as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
    return res.json()
```

### Nominatim の呼び出し例（backend）

```python
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"

async def geocode(query: str) -> list[dict]:
    """地名 → 緯度経度。1req/秒制限・User-Agent 必須に注意"""
    params = {"q": query, "format": "json", "limit": 5, "countrycodes": "jp"}
    headers = {"User-Agent": "58hack-in-omu/0.1 (hackathon project)"}
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{NOMINATIM_BASE}/search", params=params, headers=headers)
        res.raise_for_status()
    return res.json()
```

> `httpx` は backend の依存に追加が必要（`backend/pyproject.toml` の `dependencies` に `"httpx>=0.28.0"` を追記してリビルド）。

---

## DB との関係

- 店舗の位置情報が必要になるため、`stores` テーブルに **緯度（lat）・経度（lon）カラムの追加が必要**（DB 設計変更は @mstka 管轄）
- ルート生成時は `stores.crowrd_level`（0.0〜1.0）を参照して、混雑度の高い店舗を避ける・空いている店舗を提案する

```sql
-- 追加予定のカラム（参考。実施は @mstka の承認後）
ALTER TABLE stores ADD COLUMN lat DOUBLE PRECISION;
ALTER TABLE stores ADD COLUMN lon DOUBLE PRECISION;
```

---

## 環境変数

| 変数 | 場所 | デフォルト | 用途 |
|------|------|-----------|------|
| `OSRM_BASE_URL` | backend/.env | `https://router.project-osrm.org` | OSRM の向き先（自前ホストに切替可能） |
| `NOMINATIM_BASE_URL` | backend/.env | `https://nominatim.openstreetmap.org` | Nominatim の向き先 |

タイル URL はフロント側にハードコードで OK（変更したくなったら `NEXT_PUBLIC_TILE_URL` を導入する）。

---

## やってはいけないこと

- ❌ フロントから Nominatim / OSRM を直接呼ぶ（レート制限・ロジック分散の原因）
- ❌ 帰属表示（attribution）を消す
- ❌ ループで Nominatim を連打する（1req/秒制限違反。キャッシュを使う）
- ❌ Google Maps の API・タイルを混ぜる（ライセンス違反になる）
