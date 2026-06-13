"""クーポンのダミーカタログ。

本来は coupons / merchandise テーブルから取得するが、現状はダミーデータを
1 箇所に集約し、/coupons/my-list と /payment/display で共有する。
DB 実装時はこのモジュールを差し替えればよい。
"""

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class CatalogCoupon:
    coupon_id: str
    title: str
    qr_code_url: str
    expiry_date: date
    is_used: bool
    # 利用にかかるアプリ内コイン（INSUFFICIENT_COINS 判定に使用）
    cost_coins: int


_CATALOG: list[CatalogCoupon] = [
    CatalogCoupon(
        coupon_id="cp_doutor_50",
        title="ドトールコーヒーショップ\nアイスコーヒー50円引き",
        qr_code_url="https://example.com/qrcodes/doutor_50.png",
        expiry_date=date(2026, 6, 6),
        is_used=False,
        cost_coins=50,
    ),
    CatalogCoupon(
        coupon_id="cp_doutor_100",
        title="ドトールコーヒーショップ\nアイスコーヒー100円引き",
        qr_code_url="https://example.com/qrcodes/doutor_100.png",
        expiry_date=date(2026, 6, 6),
        is_used=False,
        cost_coins=100,
    ),
    CatalogCoupon(
        coupon_id="cp_doutor_150",
        title="ドトールコーヒーショップ\nアイスコーヒー150円引き",
        qr_code_url="https://example.com/qrcodes/doutor_150.png",
        expiry_date=date(2026, 6, 6),
        is_used=True,
        cost_coins=150,
    ),
]


def all_coupons() -> list[CatalogCoupon]:
    return list(_CATALOG)


def find_coupon(coupon_id: str) -> CatalogCoupon | None:
    return next((c for c in _CATALOG if c.coupon_id == coupon_id), None)
