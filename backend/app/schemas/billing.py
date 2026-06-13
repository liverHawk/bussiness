from pydantic import BaseModel


class CoinPurchaseRequest(BaseModel):
    coinAmount: int


class CoinPurchaseResponse(BaseModel):
    paymentId: str
    coinAmount: int
    amountInYen: int
    stripeCheckoutUrl: str


class PaymentResultResponse(BaseModel):
    paymentId: str
    status: str          # PENDING | COMPLETED | FAILED
    addedCoins: int
    currentTotalCoins: int
