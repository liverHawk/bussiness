import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

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
    # Supabase Pooler は prepared statement 非対応（asyncpg の statement_cache_size のみ有効）
    if "pooler.supabase.com" in url:
        args["statement_cache_size"] = 0
    return args


def _engine_kwargs() -> dict:
    url = _normalize_database_url(settings.database_url)
    kwargs: dict = {
        "echo": False,
        "connect_args": _connect_args(),
        "pool_pre_ping": True,
    }
    # Supabase Pooler 側でプールするため、アプリ側は NullPool を使う
    if "pooler.supabase.com" in url:
        kwargs["poolclass"] = NullPool
    return kwargs


engine = create_async_engine(
    _normalize_database_url(settings.database_url),
    **_engine_kwargs(),
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
