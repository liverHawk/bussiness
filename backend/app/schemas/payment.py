from pydantic import BaseModel


class SelectedCoupon(BaseModel):
    couponId: str
    title: str
    expiryDate: str
    qrCodeUrl: str


class PaymentDisplayResponse(BaseModel):
    accountName: str
    qrCodeUrl: str
    selectedCoupon: SelectedCoupon
