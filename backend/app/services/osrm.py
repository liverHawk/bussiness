"""OSRM デモサーバーを使ったルート計算サービス。

利用ポリシー: 開発・デモ用途のみ。
本番で大量アクセスする場合は自前ホスト (OSRM_BASE_URL 環境変数) を使うこと。
"""

import httpx

from app.config import settings

OSRM_BASE = getattr(settings, "osrm_base_url", "https://router.project-osrm.org")


def _coord(lat: float, lon: float) -> str:
    return f"{lon},{lat}"


async def fetch_route(waypoints: list[tuple[float, float]]) -> dict:
    """複数ウェイポイント間の徒歩ルートを取得する。

    Args:
        waypoints: [(lat, lon), ...] 順序通りに経由する座標リスト

    Returns:
        OSRM /route/v1/foot レスポンス dict
    """
    coords = ";".join(_coord(lat, lon) for lat, lon in waypoints)
    url = f"{OSRM_BASE}/route/v1/foot/{coords}"
    params = {
        "overview": "simplified",
        "geometries": "geojson",
        "steps": "false",
        "annotations": "false",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
    return res.json()


async def fetch_duration_matrix(
    sources: list[tuple[float, float]],
    destinations: list[tuple[float, float]],
) -> list[list[float]]:
    """OSRM table API で所要時間行列（秒）を取得する。

    sources と destinations は同じリストを渡すと正方行列になる。
    返却値は sources×destinations の 2D リスト（秒）。
    """
    coords = ";".join(_coord(lat, lon) for lat, lon in sources + destinations)
    n_src = len(sources)
    src_idx = ";".join(str(i) for i in range(n_src))
    dst_idx = ";".join(str(i + n_src) for i in range(len(destinations)))
    url = f"{OSRM_BASE}/table/v1/foot/{coords}"
    params = {
        "sources": src_idx,
        "destinations": dst_idx,
        "annotations": "duration",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, params=params)
        res.raise_for_status()
    data = res.json()
    return data.get("durations", [[]])
