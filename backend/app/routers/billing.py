"""コイン購入・決済結果取得・Stripe Webhook。

POST /billing/coins/purchase      Stripe Checkout を作成し決済 URL を発行する
GET  /billing/payments/{payment}  決済結果（追加コイン・総保有コイン）を取得する
POST /billing/webhook             Stripe からの決済完了通知を受け取りコインを付与する
"""

import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Request
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
    """コインの購入手続きを開始し、Stripe の決済用 URL を発行する。"""
    if body.coinAmount <= 0 or body.coinAmount > _MAX_COIN_AMOUNT:
        raise _error(400, "INVALID_AMOUNT", "購入できるコインの数量が正しくありません")

    if not stripe_service.is_configured():
        raise _error(503, "SERVER_ERROR", "決済サービスが設定されていません")

    amount_yen = body.coinAmount * settings.coin_to_yen_rate
    payment_id = f"pay_{secrets.token_hex(8)}"

    try:
        checkout_url = stripe_service.create_checkout_session(
            payment_id=payment_id,
            coin_amount=body.coinAmount,
            amount_yen=amount_yen,
        )
    except stripe_service.StripeError as exc:
        raise _error(503, "SERVER_ERROR", exc.message) from exc

    payment = Payment(
        payment_id=payment_id,
        user_id=current_user.user_id,
        coin_amount=body.coinAmount,
        amount_yen=amount_yen,
        status="PENDING",
        stripe_checkout_url=checkout_url,
    )
    db.add(payment)
    await db.commit()

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
    """決済結果を確認し、追加コイン数と現在の総保有コインを返す。

    COMPLETED への更新・コイン付与は Webhook で行われるため、ここでは
    現在の状態をそのまま返す。
    """
    result = await db.execute(
        select(Payment).where(Payment.payment_id == payment_id)
    )
    payment = result.scalar_one_or_none()

    if payment is None or payment.user_id != current_user.user_id:
        raise _error(404, "PAYMENT_NOT_FOUND", "指定された決済情報が見つかりません")

    user_result = await db.execute(
        select(User).where(User.user_id == payment.user_id)
    )
    user = user_result.scalar_one_or_none()
    current_total = user.coin if user is not None else 0

    added_coins = payment.coin_amount if payment.status == "COMPLETED" else 0

    return PaymentResultResponse(
        paymentId=payment.payment_id,
        status=payment.status,
        addedCoins=added_coins,
        currentTotalCoins=current_total,
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Stripe からの決済イベントを受け取り、完了時にコインを付与する。

    署名検証のため raw body を使用する。checkout.session.completed を受信したら
    対応する payment を COMPLETED にしてユーザーへコインを加算する（冪等）。
    """
    payload = await request.body()
    if stripe_signature is None:
        raise _error(400, "INVALID_SIGNATURE", "署名ヘッダーがありません")

    try:
        event = stripe_service.verify_webhook(payload, stripe_signature)
    except stripe_service.StripeError as exc:
        raise _error(400, "INVALID_SIGNATURE", exc.message) from exc

    if event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        payment_id = (session.get("metadata") or {}).get("payment_id") \
            or session.get("client_reference_id")

        if payment_id:
            result = await db.execute(
                select(Payment).where(Payment.payment_id == payment_id)
            )
            payment = result.scalar_one_or_none()

            # PENDING のときだけ加算（冪等性を担保）
            if payment is not None and payment.status == "PENDING":
                user_result = await db.execute(
                    select(User).where(User.user_id == payment.user_id)
                )
                user = user_result.scalar_one_or_none()
                if user is not None:
                    user.coin += payment.coin_amount
                payment.status = "COMPLETED"
                await db.commit()

    return {"received": True}
