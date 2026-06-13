from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/coupons", tags=["coupons"])


class CouponItem(BaseModel):
    couponId: str
    title: str
    qrCodeUrl: str
    expiryDate: str
    isUsed: bool


class MyCouponsResponse(BaseModel):
    myCoupons: list[CouponItem]


# ダミーデータ（後でDBから取得するように変更する）
DUMMY_COUPONS: list[CouponItem] = [
    CouponItem(
        couponId="cp_doutor_50",
        title="ドトールコーヒーショップ\nアイスコーヒー50円引き",
        qrCodeUrl="https://example.com/qrcodes/doutor_50.png",
        expiryDate="2026/6/6",
        isUsed=False,
    ),
    CouponItem(
        couponId="cp_doutor_100",
        title="ドトールコーヒーショップ\nアイスコーヒー100円引き",
        qrCodeUrl="https://example.com/qrcodes/doutor_100.png",
        expiryDate="2026/6/6",
        isUsed=False,
    ),
    CouponItem(
        couponId="cp_doutor_150",
        title="ドトールコーヒーショップ\nアイスコーヒー150円引き",
        qrCodeUrl="https://example.com/qrcodes/doutor_150.png",
        expiryDate="2026/6/6",
        isUsed=True,
    ),
]


@router.get("/my-list", response_model=MyCouponsResponse)
async def get_my_coupons(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="認証トークンが不正です")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="認証トークンがありません")

    # TODO: 認証実装後にtokenでユーザーを特定してDBから取得する
    return MyCouponsResponse(myCoupons=DUMMY_COUPONS)