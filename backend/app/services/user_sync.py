"""Supabase Auth ユーザーと public.users 行の同期。"""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.supabase_auth import SupabaseAuthResult

DEFAULT_PWD_HASH = "0" * 64


async def ensure_user_record(
    db: AsyncSession,
    auth: SupabaseAuthResult,
    *,
    pwd_hash: str | None = None,
) -> User:
    """Auth 情報に基づき DB ユーザーを取得または作成する。"""
    result = await db.execute(select(User).where(User.e_mail == auth.email))
    user = result.scalar_one_or_none()

    if user is None:
        result = await db.execute(select(User).where(User.user_id == auth.user_id))
        user = result.scalar_one_or_none()

    if user is None:
        user = User(
            user_id=auth.user_id,
            type="User",
            name=auth.name or auth.email.split("@")[0],
            e_mail=auth.email,
            pwd_hash=pwd_hash or DEFAULT_PWD_HASH,
        )
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
            return user
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(User).where(User.e_mail == auth.email))
            user = result.scalar_one_or_none()
            if user is None:
                raise

    changed = False
    if auth.name and user.name != auth.name:
        user.name = auth.name
        changed = True
    if pwd_hash:
        user.pwd_hash = pwd_hash
        changed = True
    if changed:
        await db.commit()
        await db.refresh(user)
    return user
