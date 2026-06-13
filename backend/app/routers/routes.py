"""ルート生成・保存・一覧取得 API。

POST /routes/generate  混雑を考慮した徒歩ルートを生成して DB に保存する
GET  /routes           ログインユーザーの保存済みルート一覧を返す
"""

import math
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.route import Route
from app.models.store import Store
from app.schemas.errors import ErrorBody, ErrorResponse
from app.schemas.route import (
    DaySummaryEntry,
    RouteGenerateRequest,
    RouteGenerateResponse,
    SavedRoute,
    SavedRoutesResponse,
    TimelineEntry,
)
from app.services.osrm import fetch_route
from app.services.supabase_auth import SupabaseAuthResult

router = APIRouter(prefix="/routes", tags=["routes"])

# 混雑度が高い場合に加算する待ち時間（分）
_CONGESTION_WAIT: dict[str, int] = {
    "empty": 0,
    "few_empty": 3,
    "few_crowded": 8,
    "crowded": 15,
}

_EARTH_R = 6371.0  # km


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """2点間の距離（km）。"""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.sin(dlon / 2) ** 2
    return _EARTH_R * 2 * math.asin(math.sqrt(a))


def _congestion_label(level: float | None) -> str:
    if level is None:
        return "empty"
    if level < 0.25:
        return "empty"
    if level < 0.5:
        return "few_empty"
    if level < 0.75:
        return "few_crowded"
    return "crowded"


async def _nearest_store(
    lat: float, lon: float, db: AsyncSession, radius_km: float = 0.3
) -> Store | None:
    """指定座標から radius_km 以内で最近傍の店舗を返す。"""
    result = await db.execute(
        select(Store).where(Store.lat.isnot(None), Store.lon.isnot(None))
    )
    stores = result.scalars().all()
    best: Store | None = None
    best_dist = float("inf")
    for s in stores:
        d = _haversine(lat, lon, float(s.lat), float(s.lon))
        if d < radius_km and d < best_dist:
            best_dist = d
            best = s
    return best


@router.post("/generate", response_model=RouteGenerateResponse)
async def generate_route(
    body: RouteGenerateRequest,
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RouteGenerateResponse:
    """出発地・目的地群・出発時刻から混雑を考慮したルートを生成し保存する。

    アルゴリズム:
    1. OSRM /route で全ウェイポイント間の所要時間・距離を取得
    2. 各目的地の最近傍店舗の混雑度から待ち時間ペナルティを加算
    3. タイムラインを構築して DB に保存
    """
    if len(body.destinations) > 5:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorBody(
                    code="TOO_MANY_DESTINATIONS",
                    message="一度に指定できる目的地は5箇所までです",
                )
            ).model_dump(),
        )

    # ウェイポイント: [出発地, *目的地]
    waypoints: list[tuple[float, float]] = [
        (body.startLocation.latitude, body.startLocation.longitude),
        *[(d.latitude, d.longitude) for d in body.destinations],
    ]

    # OSRM でルート取得
    try:
        osrm_data = await fetch_route(waypoints)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail=ErrorResponse(
                error=ErrorBody(
                    code="ROUTING_UNAVAILABLE",
                    message="ルート計算サービスに接続できませんでした。しばらくしてから再試行してください。",
                )
            ).model_dump(),
        )

    legs = osrm_data.get("routes", [{}])[0].get("legs", [])
    total_duration_sec: float = sum(leg.get("duration", 0) for leg in legs)
    total_distance_m: float = sum(leg.get("distance", 0) for leg in legs)

    # タイムライン構築
    current_time: datetime = body.specifiedDateTime
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    timeline: list[TimelineEntry] = []

    # 出発地エントリ
    timeline.append(
        TimelineEntry(
            sequence=1,
            locationName="出発地",
            actionLabel="出発",
            estimatedHour=current_time.hour,
            estimatedMinute=current_time.minute,
            crowd=None,
            latitude=body.startLocation.latitude,
            longitude=body.startLocation.longitude,
        )
    )

    for i, (dest, leg) in enumerate(zip(body.destinations, legs)):
        travel_sec: float = leg.get("duration", 0)
        current_time += timedelta(seconds=travel_sec)

        # 最近傍店舗の混雑情報
        store = await _nearest_store(dest.latitude, dest.longitude, db)
        crowd: float | None = float(store.crowrd_level) if store and store.crowrd_level is not None else None
        label = _congestion_label(crowd)
        wait_min = _CONGESTION_WAIT.get(label, 0)

        location_name = store.name if store else f"目的地{i + 1}"
        action = "到着・滞在" if wait_min == 0 else f"到着（混雑 +{wait_min}分待ち見込み）"

        timeline.append(
            TimelineEntry(
                sequence=i + 2,
                locationName=location_name,
                actionLabel=action,
                estimatedHour=current_time.hour,
                estimatedMinute=current_time.minute,
                crowd=crowd,
                latitude=dest.latitude,
                longitude=dest.longitude,
            )
        )

        # 混雑ペナルティ分だけ時計を進める
        current_time += timedelta(minutes=wait_min)

    route_id = str(uuid.uuid4())
    title = f"ルート {body.specifiedDateTime.strftime('%m/%d %H:%M')}"

    response = RouteGenerateResponse(
        routeId=route_id,
        totalDuration=int(total_duration_sec / 60),
        totalDistance=round(total_distance_m / 1000, 2),
        timeline=timeline,
    )

    # ルートを DB に保存
    route_record = Route(
        route_id=uuid.UUID(route_id),
        user_id=current_user.user_id,
        title=title,
        route_data=response.model_dump(mode="json"),
    )
    db.add(route_record)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        # 保存失敗でもレスポンスは返す（routes テーブルが未作成の場合など）

    return response


@router.get("", response_model=SavedRoutesResponse)
async def list_routes(
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedRoutesResponse:
    """ログインユーザーの保存済みルート一覧を返す（新しい順）。"""
    try:
        result = await db.execute(
            select(Route)
            .where(Route.user_id == current_user.user_id)
            .order_by(Route.created_at.desc())
        )
        records = result.scalars().all()
    except Exception:
        # routes テーブルが未作成の場合は空リストを返す
        return SavedRoutesResponse(savedRoutes=[])

    saved: list[SavedRoute] = []
    for r in records:
        data: dict = r.route_data or {}
        timeline: list[dict] = data.get("timeline", [])

        # タイムラインを日別にまとめる（現状は1日として扱う）
        spot_names = [
            t["locationName"]
            for t in timeline
            if t.get("actionLabel", "").startswith("到着")
        ]
        days_summary = [
            DaySummaryEntry(day=1, label="1日目", spots=spot_names)
        ]

        saved.append(
            SavedRoute(
                routeId=str(r.route_id),
                title=r.title,
                totalDays=1,
                createdAt=r.created_at.isoformat(),
                daysSummary=days_summary,
            )
        )

    return SavedRoutesResponse(savedRoutes=saved)
