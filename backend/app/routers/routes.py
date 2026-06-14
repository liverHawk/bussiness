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
from app.models.route import Route, RoutePoint
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

# 混雑度ラベルごとの待ち時間ペナルティ（分）
_CONGESTION_WAIT: dict[str, int] = {
    "empty": 0,
    "few_empty": 3,
    "few_crowded": 8,
    "crowded": 15,
}

_EARTH_R = 6371.0


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
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
    2. 各目的地の最近傍店舗（半径300m）の混雑度から待ち時間ペナルティを加算
    3. タイムラインを構築して routes / route_points テーブルに保存
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

    waypoints: list[tuple[float, float]] = [
        (body.startLocation.latitude, body.startLocation.longitude),
        *[(d.latitude, d.longitude) for d in body.destinations],
    ]

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

    osrm_route = osrm_data.get("routes", [{}])[0]
    legs = osrm_route.get("legs", [])
    total_duration_sec: float = sum(leg.get("duration", 0) for leg in legs)
    total_distance_m: float = sum(leg.get("distance", 0) for leg in legs)
    # GeoJSON geometry: [[lon, lat], ...] → [[lat, lon], ...]
    geom_coords = osrm_route.get("geometry", {}).get("coordinates", [])
    path = [[c[1], c[0]] for c in geom_coords]

    current_time: datetime = body.specifiedDateTime
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    timeline: list[TimelineEntry] = []
    matched_stores: list[Store] = []

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

        store = await _nearest_store(dest.latitude, dest.longitude, db)
        if store:
            matched_stores.append(store)

        crowd: float | None = (
            float(store.crowrd_level)
            if store and store.crowrd_level is not None
            else None
        )
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
        current_time += timedelta(minutes=wait_min)

    route_id = uuid.uuid4()
    route_name = f"ルート {body.specifiedDateTime.strftime('%m/%d %H:%M')}"

    # routes テーブルに保存
    route_record = Route(
        route_id=route_id,
        user=current_user.user_id,
        route_name=route_name,
        start_datetime=body.specifiedDateTime,
        goal_datetime=current_time,
    )
    db.add(route_record)

    # route_points に関連店舗を登録
    for store in matched_stores:
        db.add(RoutePoint(route=route_id, store=store.store_id))

    try:
        await db.commit()
    except Exception:
        await db.rollback()

    return RouteGenerateResponse(
        routeId=str(route_id),
        totalDuration=int(total_duration_sec / 60),
        totalDistance=round(total_distance_m / 1000, 2),
        timeline=timeline,
        path=path,
    )


@router.get("", response_model=SavedRoutesResponse)
async def list_routes(
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedRoutesResponse:
    """ログインユーザーの保存済みルート一覧を新しい順で返す。"""
    result = await db.execute(
        select(Route)
        .where(Route.user == current_user.user_id)
        .order_by(Route.created_at.desc())
    )
    records = result.scalars().all()

    # route_points から各ルートの店舗名を取得
    saved: list[SavedRoute] = []
    for r in records:
        pts_result = await db.execute(
            select(Store.name)
            .join(RoutePoint, RoutePoint.store == Store.store_id)
            .where(RoutePoint.route == r.route_id)
            .order_by(Store.name)
        )
        spot_names = [row[0] for row in pts_result.all()]

        saved.append(
            SavedRoute(
                routeId=str(r.route_id),
                title=r.route_name,
                totalDays=1,
                createdAt=r.created_at.isoformat(),
                daysSummary=[
                    DaySummaryEntry(day=1, label="1日目", spots=spot_names)
                ],
            )
        )

    return SavedRoutesResponse(savedRoutes=saved)
