"""Supabase Auth ユーザーと public.users 行の同期。"""

import hashlib

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.supabase_auth import SupabaseAuthResult

DEFAULT_PWD_HASH = "0" * 64


def store_pwd_hash(raw: str | None) -> str:
    """DB 保存用（64文字固定）。平文パスワードは SHA-256 hex で保存する。"""
    if not raw:
        return DEFAULT_PWD_HASH
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def ensure_user_record(
    db: AsyncSession,
    auth: SupabaseAuthResult,
    *,
    pwd_hash: str | None = None,
) -> User:
    """Auth 情報に基づき DB ユーザーを取得または作成する。"""
    email = (auth.email or "").strip()
    if not email:
        raise SQLAlchemyError("ユーザーのメールアドレスが空です")

    result = await db.execute(select(User).where(User.e_mail == email))
    user = result.scalar_one_or_none()

    if user is None:
        result = await db.execute(select(User).where(User.user_id == auth.user_id))
        user = result.scalar_one_or_none()

    stored_pwd = store_pwd_hash(pwd_hash)

    if user is None:
        user = User(
            user_id=auth.user_id,
            type="User",
            name=auth.name or email.split("@")[0],
            e_mail=email,
            pwd_hash=stored_pwd,
        )
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
            return user
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(User).where(User.e_mail == email))
            user = result.scalar_one_or_none()
            if user is None:
                raise

    changed = False
    display_name = auth.name or email.split("@")[0]
    if display_name and user.name != display_name:
        user.name = display_name
        changed = True
    if pwd_hash and user.pwd_hash != stored_pwd:
        user.pwd_hash = stored_pwd
        changed = True
    if changed:
        await db.commit()
        await db.refresh(user)
    return user
