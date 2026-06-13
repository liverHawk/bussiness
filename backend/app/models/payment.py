import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Payment(Base):
    """コイン購入の決済記録。

    status: 'PENDING'（決済URL発行済み・未完了）| 'COMPLETED'（完了）| 'FAILED'

    必要な DDL（schema.sql にも追記済み）:
    CREATE TABLE payments (
        payment_id          VARCHAR(64) PRIMARY KEY,
        user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        coin_amount         INTEGER NOT NULL,
        amount_yen          INTEGER NOT NULL,
        status              VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        stripe_checkout_url TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """

    __tablename__ = "payments"

    payment_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    coin_amount: Mapped[int] = mapped_column(Integer)
    amount_yen: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    stripe_checkout_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
