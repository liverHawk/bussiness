import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


def _normalize_database_url(url: str) -> str:
    """Supabase ダッシュボードの postgresql:// を asyncpg 用に変換する。"""
    if url.startswith("postgresql://") and "+asyncpg" not in url.split("://", 1)[0]:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def _connect_args() -> dict:
    """Supabase 等のリモート PostgreSQL 向け SSL / Pooler 設定。"""
    url = settings.database_url
    args: dict = {}
    if (
        "supabase.co" in url
        or "pooler.supabase.com" in url
        or "sslmode=require" in url
    ):
        args["ssl"] = ssl.create_default_context()
    # Supabase Transaction pooler は prepared statement 非対応
    if "pooler.supabase.com" in url:
        args["statement_cache_size"] = 0
        args["prepared_statement_cache_size"] = 0
    return args


engine = create_async_engine(
    _normalize_database_url(settings.database_url),
    echo=False,
    connect_args=_connect_args(),
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
