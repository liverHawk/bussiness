import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.coupon import Coupon, CouponUsage
from app.models.user import User
from app.schemas.errors import ErrorBody, ErrorResponse
from app.schemas.payment import PaymentDisplayResponse, SelectedCoupon
from app.services.supabase_auth import SupabaseAuthResult

router = APIRouter(prefix="/payment", tags=["payment"])


def _error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=ErrorResponse(error=ErrorBody(code=code, message=message)).model_dump(),
    )


def _user_qr_url(user_id: str) -> str:
    """ユーザー個人の決済用 QR コード URL（レジ側でスキャンする）。"""
    return f"https://example.com/qrcodes/users/{user_id}.png"


@router.get("/display", response_model=PaymentDisplayResponse)
async def get_payment_display(
    couponId: str = Query(..., description="使用するクーポンのID"),
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentDisplayResponse:
    """レジ決済に必要な QR コード情報と選択クーポン情報を取得する。"""
    try:
        coupon_uuid = uuid.UUID(couponId)
    except ValueError:
        raise _error(404, "COUPON_NOT_FOUND", "指定されたクーポンが見つかりません")

    try:
        coupon_result = await db.execute(
            select(Coupon).where(Coupon.coupon_id == coupon_uuid)
        )
        coupon = coupon_result.scalar_one_or_none()
    except Exception as exc:
        raise _error(
            503, "SERVER_ERROR", "通信に失敗しました。電波の良い場所でもう一度お試しください。"
        ) from exc

    if coupon is None:
        raise _error(404, "COUPON_NOT_FOUND", "指定されたクーポンが見つかりません")

    # 有効期限チェック
    if coupon.expiry_date < date.today():
        raise _error(400, "COUPON_EXPIRED", "このクーポンの有効期限は終了しています。")

    # このユーザーが既に使用済みか
    usage_result = await db.execute(
        select(CouponUsage).where(
            CouponUsage.user_id == current_user.user_id,
            CouponUsage.coupon == coupon_uuid,
        )
    )
    if usage_result.scalar_one_or_none() is not None:
        raise _error(400, "COUPON_ALREADY_USED", "このクーポンはすでに使用済みです。")

    # ユーザー情報・コイン残高
    user_result = await db.execute(
        select(User).where(User.user_id == current_user.user_id)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise _error(404, "USER_NOT_FOUND", "ユーザーが見つかりません")

    # コイン残高チェック（required_coins が設定されている場合のみ実質的に作用）
    if user.coin < coupon.required_coins:
        raise _error(
            402,
            "INSUFFICIENT_COINS",
            "アプリ内コインの残高が不足しています。チャージしてください。",
        )

    return PaymentDisplayResponse(
        accountName=user.name,
        qrCodeUrl=_user_qr_url(str(user.user_id)),
        selectedCoupon=SelectedCoupon(
            couponId=str(coupon.coupon_id),
            title=coupon.title,
            expiryDate=f"{coupon.expiry_date.year}/{coupon.expiry_date.month}/{coupon.expiry_date.day}",
            qrCodeUrl=coupon.qr_code_url,
        ),
    )
