"""コイン購入・決済結果取得 API。

POST /billing/coins/purchase      コイン購入を開始し決済用 URL を発行する
GET  /billing/payments/{payment}  決済結果（追加コイン・総保有コイン）を取得する
"""

import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.payment import Payment
from app.models.user import User
from app.schemas.billing import (
    CoinPurchaseRequest,
    CoinPurchaseResponse,
    PaymentResultResponse,
)
from app.schemas.errors import ErrorBody, ErrorResponse
from app.services import stripe_service
from app.services.supabase_auth import SupabaseAuthResult

router = APIRouter(prefix="/billing", tags=["billing"])

# 一度に購入できるコイン数の上限
_MAX_COIN_AMOUNT = 100_000


def _error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=ErrorResponse(error=ErrorBody(code=code, message=message)).model_dump(),
    )


@router.post("/coins/purchase", response_model=CoinPurchaseResponse)
async def purchase_coins(
    body: CoinPurchaseRequest,
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CoinPurchaseResponse:
    """コインの購入手続きを開始し、決済用 URL を発行する。"""
    if body.coinAmount <= 0 or body.coinAmount > _MAX_COIN_AMOUNT:
        raise _error(400, "INVALID_AMOUNT", "購入できるコインの数量が正しくありません")

    amount_yen = body.coinAmount * settings.coin_to_yen_rate
    payment_id = f"pay_{secrets.token_hex(8)}"

    try:
        checkout_url = await stripe_service.create_checkout_session(
            payment_id=payment_id,
            coin_amount=body.coinAmount,
            amount_yen=amount_yen,
        )
    except stripe_service.StripeError as exc:
        raise _error(503, "SERVER_ERROR", exc.message) from exc

    # 決済記録を PENDING で保存（payments テーブル未作成でもレスポンスは返す）
    payment = Payment(
        payment_id=payment_id,
        user_id=current_user.user_id,
        coin_amount=body.coinAmount,
        amount_yen=amount_yen,
        status="PENDING",
        stripe_checkout_url=checkout_url,
    )
    db.add(payment)
    try:
        await db.commit()
    except Exception:
        await db.rollback()

    return CoinPurchaseResponse(
        paymentId=payment_id,
        coinAmount=body.coinAmount,
        amountInYen=amount_yen,
        stripeCheckoutUrl=checkout_url,
    )


@router.get("/payments/{payment_id}", response_model=PaymentResultResponse)
async def get_payment_result(
    payment_id: str,
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentResultResponse:
    """決済結果を確認し、追加されたコイン数と現在の総保有コインを返す。

    デモ環境（Stripe 未設定）では、初回取得時に決済完了とみなしてコインを
    加算する。Stripe 連携時は Webhook 等で COMPLETED に更新する想定。
    """
    try:
        result = await db.execute(
            select(Payment).where(Payment.payment_id == payment_id)
        )
        payment = result.scalar_one_or_none()
    except Exception:
        payment = None

    if payment is None or payment.user_id != current_user.user_id:
        raise _error(404, "PAYMENT_NOT_FOUND", "指定された決済情報が見つかりません")

    added_coins = 0

    # PENDING → COMPLETED への遷移時のみコインを加算（冪等）
    if payment.status == "PENDING" and not stripe_service.is_configured():
        user_result = await db.execute(
            select(User).where(User.user_id == payment.user_id)
        )
        user = user_result.scalar_one_or_none()
        if user is not None:
            user.coin += payment.coin_amount
            payment.status = "COMPLETED"
            added_coins = payment.coin_amount
            try:
                await db.commit()
                await db.refresh(user)
            except Exception:
                await db.rollback()
    elif payment.status == "COMPLETED":
        added_coins = payment.coin_amount

    # 現在の総保有コインを取得
    user_result = await db.execute(
        select(User).where(User.user_id == payment.user_id)
    )
    user = user_result.scalar_one_or_none()
    current_total = user.coin if user is not None else 0

    return PaymentResultResponse(
        paymentId=payment.payment_id,
        status=payment.status,
        addedCoins=added_coins,
        currentTotalCoins=current_total,
    )
