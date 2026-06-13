"""Stripe Checkout を使ったコイン購入の決済セッション生成。

STRIPE_SECRET_KEY が設定されていれば実際の Checkout セッションを作成する。
未設定（ローカル・デモ環境）の場合はプレースホルダ URL を返し、フローを通せる
ようにする。実際の課金処理はユーザー自身が Stripe の画面で行う。
"""

import httpx

from app.config import settings


class StripeError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def is_configured() -> bool:
    return bool(settings.stripe_secret_key)


async def create_checkout_session(
    payment_id: str,
    coin_amount: int,
    amount_yen: int,
) -> str:
    """Checkout セッションを作成し、決済 URL を返す。

    Stripe 未設定時はデモ用のプレースホルダ URL を返す。
    """
    if not is_configured():
        # デモ用プレースホルダ（実課金なし）
        return f"{settings.frontend_base_url}/billing/mock-checkout?payment_id={payment_id}"

    success_url = f"{settings.frontend_base_url}/billing/success?payment_id={payment_id}"
    cancel_url = f"{settings.frontend_base_url}/billing/cancel?payment_id={payment_id}"

    # Stripe Checkout Sessions API（フォームエンコード）
    form = {
        "mode": "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": payment_id,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "jpy",
        "line_items[0][price_data][unit_amount]": str(amount_yen),
        "line_items[0][price_data][product_data][name]": f"アプリ内コイン {coin_amount} 枚",
        "metadata[payment_id]": payment_id,
        "metadata[coin_amount]": str(coin_amount),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            "https://api.stripe.com/v1/checkout/sessions",
            data=form,
            auth=(settings.stripe_secret_key, ""),
        )

    if res.status_code != 200:
        raise StripeError("決済セッションの作成に失敗しました")

    data = res.json()
    url = data.get("url")
    if not url:
        raise StripeError("決済 URL を取得できませんでした")
    return url
