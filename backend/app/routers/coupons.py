from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.coupon import Coupon, CouponUsage
from app.services.supabase_auth import SupabaseAuthResult

router = APIRouter(prefix="/coupons", tags=["coupons"])


class CouponItem(BaseModel):
    couponId: str
    title: str
    qrCodeUrl: str
    expiryDate: str
    isUsed: bool


class MyCouponsResponse(BaseModel):
    myCoupons: list[CouponItem]


@router.get("/my-list", response_model=MyCouponsResponse)
async def get_my_coupons(
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MyCouponsResponse:
    """ユーザーが利用可能なクーポン一覧（未使用・使用済み含む）を返す。

    クーポンは全ユーザーに配布される。isUsed はこのユーザーの利用記録から判定する。
    """
    # このユーザーが使用済みのクーポン ID 集合
    used_result = await db.execute(
        select(CouponUsage.coupon).where(CouponUsage.user_id == current_user.user_id)
    )
    used_ids = {row[0] for row in used_result.all()}

    result = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    coupons = result.scalars().all()

    items = [
        CouponItem(
            couponId=str(c.coupon_id),
            title=c.title,
            qrCodeUrl=c.qr_code_url,
            expiryDate=f"{c.expiry_date.year}/{c.expiry_date.month}/{c.expiry_date.day}",
            isUsed=c.coupon_id in used_ids,
        )
        for c in coupons
    ]
    return MyCouponsResponse(myCoupons=items)
