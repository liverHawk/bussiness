from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.store import Review, Store
from app.schemas.review import ReviewSpot, ReviewSpotsResponse
from app.services.supabase_auth import SupabaseAuthResult

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/spots", response_model=ReviewSpotsResponse)
async def list_review_spots(
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewSpotsResponse:
    """レビューまたはフォトが投稿されているスポット一覧を返す。

    平均評価が高い順、同点なら総レビュー数が多い順で並べる。
    """
    avg_rating = func.coalesce(func.avg(Review.rating), 0.0).label("avg_rating")
    total_reviews = func.count(Review.review_id).label("total_reviews")
    # photo_url が NULL でない件数
    total_photos = func.count(Review.photo_url).label("total_photos")
    # 代表画像（最初に見つかった photo_url）
    first_photo = func.min(Review.photo_url).label("first_photo")

    stmt = (
        select(
            Store.store_id,
            Store.name,
            avg_rating,
            total_reviews,
            total_photos,
            first_photo,
        )
        .join(Review, Review.store == Store.store_id)
        .group_by(Store.store_id, Store.name)
        # レビューまたは写真が最低1件あるスポットのみ
        .having(total_reviews > 0)
        .order_by(avg_rating.desc(), total_reviews.desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    spots = [
        ReviewSpot(
            spotId=str(row.store_id),
            name=row.name,
            imageUrl=row.first_photo,
            reviewRating=round(float(row.avg_rating), 1),
            totalReviews=row.total_reviews,
            totalPhotos=row.total_photos,
        )
        for row in rows
    ]
    return ReviewSpotsResponse(reviewSpots=spots)
