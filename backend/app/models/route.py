import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Route(Base):
    """ユーザーが生成したルート（既存 routes テーブルに対応）。"""

    __tablename__ = "routes"

    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # 予約語のため "user" でクォートされている
    user: Mapped[uuid.UUID] = mapped_column("user", UUID(as_uuid=True))
    route_name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    start_datetime: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    goal_datetime: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class RoutePoint(Base):
    """ルートに含まれる店舗（route_points 中間テーブル）。"""

    __tablename__ = "route_points"

    route: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )
    store: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )
