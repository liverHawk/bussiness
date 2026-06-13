from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.coupon_catalog import all_coupons
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
    _user: SupabaseAuthResult = Depends(get_current_user),
) -> MyCouponsResponse:
    """ユーザーが保有しているクーポン一覧（未使用・使用済み含む）を返す。"""
    items = [
        CouponItem(
            couponId=c.coupon_id,
            title=c.title,
            qrCodeUrl=c.qr_code_url,
            expiryDate=f"{c.expiry_date.year}/{c.expiry_date.month}/{c.expiry_date.day}",
            isUsed=c.is_used,
        )
        for c in all_coupons()
    ]
    return MyCouponsResponse(myCoupons=items)
