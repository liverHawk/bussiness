import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Coupon(Base):
    """店舗が発行するクーポン。全ユーザーに配布される（所有概念なし）。

    使用状況はユーザーごとに coupon_usages で管理する。
    """

    __tablename__ = "coupons"

    coupon_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    store: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stores.store_id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_code_url: Mapped[str] = mapped_column(String(1000))
    expiry_date: Mapped[date] = mapped_column(Date)
    # クーポン利用に必要なアプリ内コイン（0 なら無料。INSUFFICIENT_COINS 判定に使用）
    required_coins: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class CouponUsage(Base):
    """ユーザーがどのクーポンを使用したかの記録。"""

    __tablename__ = "coupon_usages"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    coupon: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("coupons.coupon_id", ondelete="CASCADE"),
        primary_key=True,
    )
    used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
