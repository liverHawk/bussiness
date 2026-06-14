import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    type: Mapped[str] = mapped_column(String(10))
    name: Mapped[str] = mapped_column(String(50))
    e_mail: Mapped[str] = mapped_column(String(100), unique=True)
    pwd_hash: Mapped[str] = mapped_column(String(64))
    coin: Mapped[int] = mapped_column(Integer, default=0)
    notice: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
