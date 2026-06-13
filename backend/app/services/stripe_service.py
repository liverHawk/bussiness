"""Stripe（テスト環境）を使ったコイン購入の決済。

- STRIPE_SECRET_KEY (sk_test_...) で Checkout セッションを作成
- STRIPE_WEBHOOK_SECRET (whsec_...) で Webhook 署名を検証

実際の課金処理はユーザー自身が Stripe の Checkout 画面で行う。
バックエンドはセッション作成と Webhook 受信のみを担当する。
"""

import stripe

from app.config import settings


class StripeError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def is_configured() -> bool:
    return bool(settings.stripe_secret_key)


def _client() -> None:
    if not settings.stripe_secret_key:
        raise StripeError("STRIPE_SECRET_KEY が設定されていません")
    stripe.api_key = settings.stripe_secret_key


def create_checkout_session(
    payment_id: str,
    coin_amount: int,
    amount_yen: int,
) -> str:
    """Checkout セッションを作成し、決済 URL を返す。"""
    _client()

    success_url = (
        f"{settings.frontend_base_url}/billing/success"
        f"?payment_id={payment_id}&session_id={{CHECKOUT_SESSION_ID}}"
    )
    cancel_url = f"{settings.frontend_base_url}/billing/cancel?payment_id={payment_id}"

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=payment_id,
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": "jpy",
                        "unit_amount": amount_yen,
                        "product_data": {
                            "name": f"アプリ内コイン {coin_amount} 枚",
                        },
                    },
                }
            ],
            metadata={
                "payment_id": payment_id,
                "coin_amount": str(coin_amount),
            },
        )
    except stripe.StripeError as exc:  # type: ignore[attr-defined]
        raise StripeError(f"決済セッションの作成に失敗しました: {exc}") from exc

    if not session.url:
        raise StripeError("決済 URL を取得できませんでした")
    return session.url


def verify_webhook(payload: bytes, signature: str) -> dict:
    """Webhook の署名を検証し、イベント dict を返す。"""
    if not settings.stripe_webhook_secret:
        raise StripeError("STRIPE_WEBHOOK_SECRET が設定されていません")
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.SignatureVerificationError) as exc:  # type: ignore[attr-defined]
        raise StripeError("Webhook 署名の検証に失敗しました") from exc
    return event
