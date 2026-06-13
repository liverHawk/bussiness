import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Route(Base):
    """ユーザーが生成・保存したルートプラン。

    route_data には /routes/generate のレスポンス本体（JSON）をそのまま保存する。

    必要な DDL（未適用の場合は手動で実行してください）:
    CREATE TABLE routes (
        route_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title      VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        route_data JSONB NOT NULL
    );
    """

    __tablename__ = "routes"

    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    title: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    route_data: Mapped[dict] = mapped_column(JSON)
