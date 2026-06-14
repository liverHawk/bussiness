import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


def _connect_args() -> dict:
    """Supabase 等のリモート PostgreSQL 向け SSL 設定。"""
    url = settings.database_url
    if "supabase.co" in url or "sslmode=require" in url:
        return {"ssl": ssl.create_default_context()}
    return {}


engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args=_connect_args(),
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
