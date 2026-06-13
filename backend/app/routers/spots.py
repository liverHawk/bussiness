import asyncio

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.store import Review, Store, StoreTag, Tag
from app.schemas.spot import SpotResponse, SpotSearchResponse
from app.services.supabase_auth import SupabaseAuthResult

router = APIRouter(prefix="/spots", tags=["spots"])

_geocode_lock = asyncio.Lock()
_last_geocode_time: float = 0.0


class GeocodeResult(BaseModel):
    latitude: float
    longitude: float
    displayName: str


class SpotDetailResponse(BaseModel):
    spotId: str
    name: str
    description: str
    category: str
    latitude: float
    longitude: float
    congestionStatus: str
    reviewRating: float


class SpotReviewItem(BaseModel):
    reviewId: str
    userName: str
    rating: float
    content: str
    photoUrl: str | None


class SpotReviewsResponse(BaseModel):
    reviews: list[SpotReviewItem]

# フロントのジャンル ID → tags.name
GENRE_TAG_NAMES: dict[str, str] = {
    "cafe": "カフェ",
    "restaurant": "レストラン",
    "temple": "寺院・神社・城",
    "park": "公園",
    "museum": "美術館・博物館・ミュージアム",
}


def _congestion_label(level: float | None) -> str:
    """crowrd_level（0.0=空き 〜 1.0=混雑）を表示用ラベルに変換する。"""
    if level is None:
        return "不明"
    if level < 0.25:
        return "空いている"
    if level < 0.5:
        return "少し空き"
    if level < 0.75:
        return "少し混雑"
    return "混雑"


def _congestion_filter(crowrd_level, values: list[str]):
    ranges = {
        "empty": and_(crowrd_level >= 0.0, crowrd_level < 0.25),
        "few_empty": and_(crowrd_level >= 0.25, crowrd_level < 0.5),
        "few_crowded": and_(crowrd_level >= 0.5, crowrd_level < 0.75),
        "crowded": and_(crowrd_level >= 0.75, crowrd_level <= 1.0),
    }
    conditions = [ranges[v] for v in values if v in ranges]
    return or_(*conditions) if conditions else None


def _review_filter(avg_rating, values: list[str]):
    ranges = {
        "4.1-5.0": avg_rating > 4.0,
        "3.1-4.0": and_(avg_rating > 3.0, avg_rating <= 4.0),
        "2.1-3.0": and_(avg_rating > 2.0, avg_rating <= 3.0),
        "2.0-below": avg_rating <= 2.0,
    }
    conditions = [ranges[v] for v in values if v in ranges]
    return or_(*conditions) if conditions else None


@router.get("/search", response_model=SpotSearchResponse)
async def search_spots(
    congestion: list[str] = Query(default=[]),
    genre: list[str] = Query(default=[]),
    review: list[str] = Query(default=[]),
    db: AsyncSession = Depends(get_db),
    _user: SupabaseAuthResult = Depends(get_current_user),
) -> SpotSearchResponse:
    """フィルター条件に合うスポット（店舗）一覧を取得する。"""

    # 店舗ごとの平均レビュー（レビュー無しは 0.0）
    avg_rating = (
        select(func.coalesce(func.avg(Review.rating), 0.0))
        .where(Review.store == Store.store_id)
        .scalar_subquery()
    )
    # 店舗の代表カテゴリ（タグ名を 1 件）
    category = (
        select(Tag.name)
        .join(StoreTag, StoreTag.tag == Tag.tag_id)
        .where(StoreTag.store == Store.store_id)
        .order_by(Tag.name)
        .limit(1)
        .scalar_subquery()
    )

    stmt = select(
        Store.store_id,
        Store.name,
        Store.lat,
        Store.lon,
        Store.crowrd_level,
        category.label("category"),
        avg_rating.label("avg_rating"),
    )

    congestion_cond = _congestion_filter(Store.crowrd_level, congestion)
    if congestion_cond is not None:
        stmt = stmt.where(congestion_cond)

    if genre:
        names = [GENRE_TAG_NAMES[g] for g in genre if g in GENRE_TAG_NAMES]
        if names:
            genre_exists = (
                select(1)
                .select_from(StoreTag)
                .join(Tag, StoreTag.tag == Tag.tag_id)
                .where(StoreTag.store == Store.store_id, Tag.name.in_(names))
                .exists()
            )
            stmt = stmt.where(genre_exists)
        else:
            return SpotSearchResponse(spots=[])

    review_cond = _review_filter(avg_rating, review)
    if review_cond is not None:
        stmt = stmt.where(review_cond)

    result = await db.execute(stmt)
    rows = result.all()

    spots = [
        SpotResponse(
            spotId=str(row.store_id),
            name=row.name,
            category=row.category or "",
            latitude=row.lat if row.lat is not None else 0.0,
            longitude=row.lon if row.lon is not None else 0.0,
            congestionStatus=_congestion_label(row.crowrd_level),
            reviewRating=round(float(row.avg_rating), 1),
        )
        for row in rows
    ]
    return SpotSearchResponse(spots=spots)


@router.get("/geocode", response_model=GeocodeResult)
async def geocode_address(
    q: str = Query(..., min_length=1),
    _user: SupabaseAuthResult = Depends(get_current_user),
) -> GeocodeResult:
    """住所・地名を緯度経度に変換する（Nominatim 経由）。Nominatim の利用規約に従い 1req/s 制限。"""
    global _last_geocode_time
    import time

    async with _geocode_lock:
        now = time.monotonic()
        wait = 1.0 - (now - _last_geocode_time)
        if wait > 0:
            await asyncio.sleep(wait)
        _last_geocode_time = time.monotonic()

    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": q, "format": "json", "limit": 1}
    headers = {"User-Agent": "58hack-in-OMU/1.0 (demo)"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(url, params=params, headers=headers)
        res.raise_for_status()
    data = res.json()
    if not data:
        raise HTTPException(status_code=404, detail="場所が見つかりませんでした")
    item = data[0]
    return GeocodeResult(
        latitude=float(item["lat"]),
        longitude=float(item["lon"]),
        displayName=item.get("display_name", q),
    )


@router.get("/{spot_id}", response_model=SpotDetailResponse)
async def get_spot(
    spot_id: str,
    db: AsyncSession = Depends(get_db),
    _user: SupabaseAuthResult = Depends(get_current_user),
) -> SpotDetailResponse:
    """スポット（店舗）の詳細情報を取得する。"""
    avg_rating = (
        select(func.coalesce(func.avg(Review.rating), 0.0))
        .where(Review.store == Store.store_id)
        .scalar_subquery()
    )
    category = (
        select(Tag.name)
        .join(StoreTag, StoreTag.tag == Tag.tag_id)
        .where(StoreTag.store == Store.store_id)
        .order_by(Tag.name)
        .limit(1)
        .scalar_subquery()
    )
    result = await db.execute(
        select(
            Store.store_id,
            Store.name,
            Store.description,
            Store.lat,
            Store.lon,
            Store.crowrd_level,
            category.label("category"),
            avg_rating.label("avg_rating"),
        ).where(Store.store_id == spot_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="スポットが見つかりません")
    return SpotDetailResponse(
        spotId=str(row.store_id),
        name=row.name,
        description=row.description,
        category=row.category or "",
        latitude=row.lat if row.lat is not None else 0.0,
        longitude=row.lon if row.lon is not None else 0.0,
        congestionStatus=_congestion_label(row.crowrd_level),
        reviewRating=round(float(row.avg_rating), 1),
    )


@router.get("/{spot_id}/reviews", response_model=SpotReviewsResponse)
async def get_spot_reviews(
    spot_id: str,
    db: AsyncSession = Depends(get_db),
    _user: SupabaseAuthResult = Depends(get_current_user),
) -> SpotReviewsResponse:
    """指定スポットのレビュー一覧を取得する。"""
    from app.models.user import User

    result = await db.execute(
        select(
            Review.review_id,
            Review.rating,
            Review.content,
            Review.photo_url,
            User.name.label("user_name"),
        )
        .join(User, User.user_id == Review.post_user)
        .where(Review.store == spot_id)
        .order_by(Review.review_id.desc())
    )
    rows = result.all()
    return SpotReviewsResponse(
        reviews=[
            SpotReviewItem(
                reviewId=str(row.review_id),
                userName=row.user_name,
                rating=row.rating or 0.0,
                content=row.content,
                photoUrl=row.photo_url,
            )
            for row in rows
        ]
    )
