from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.schemas.errors import ErrorBody, ErrorResponse
from app.services.supabase_auth import (
    SupabaseAuthError,
    SupabaseAuthResult,
    SupabaseAuthService,
    get_supabase_auth_service,
)
from app.services.user_sync import ensure_user_record

router = APIRouter(prefix="/auth", tags=["auth"])


class LogoutResponse(BaseModel):
    success: bool
    message: str


def _user_response(user: User) -> UserResponse:
    return UserResponse(id=str(user.user_id), name=user.name, email=user.e_mail)


def _register_confirmation_message() -> str:
    return (
        "確認メールを送信しました。"
        "メール内のリンクをクリック後、ログインしてください。"
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: SupabaseAuthService = Depends(get_supabase_auth_service),
) -> AuthResponse:
    try:
        auth_result = await auth_service.sign_in(body.loginId, body.pwd_hash)
    except SupabaseAuthError as exc:
        if exc.code == "INVALID_CREDENTIALS":
            raise HTTPException(
                status_code=401,
                detail=ErrorResponse(
                    error=ErrorBody(code=exc.code, message=exc.message)
                ).model_dump(),
            ) from exc
        raise HTTPException(
            status_code=exc.status_code,
            detail=ErrorResponse(
                error=ErrorBody(code=exc.code, message=exc.message)
            ).model_dump(),
        ) from exc

    if not auth_result.access_token:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorBody(
                    code="AUTH_ERROR",
                    message="認証トークンを取得できませんでした",
                )
            ).model_dump(),
        )

    user = await ensure_user_record(db, auth_result, pwd_hash=body.pwd_hash)

    return AuthResponse(
        accessToken=auth_result.access_token,
        user=_user_response(user),
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    current_user: SupabaseAuthResult = Depends(get_current_user),
    auth_service: SupabaseAuthService = Depends(get_supabase_auth_service),
) -> LogoutResponse:
    """認証トークンを無効化し、安全にログアウトする。"""
    if current_user.access_token:
        try:
            await auth_service.sign_out(current_user.access_token)
        except SupabaseAuthError as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail=ErrorResponse(
                    error=ErrorBody(code=exc.code, message=exc.message)
                ).model_dump(),
            ) from exc

    return LogoutResponse(success=True, message="ログアウトしました")


@router.post("/register", response_model=AuthResponse)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: SupabaseAuthService = Depends(get_supabase_auth_service),
) -> AuthResponse:
    existing = await db.execute(select(User).where(User.e_mail == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail=ErrorResponse(
                error=ErrorBody(
                    code="EMAIL_ALREADY_EXISTS",
                    message="このメールアドレスは既に登録されています",
                )
            ).model_dump(),
        )

    try:
        auth_result = await auth_service.sign_up(
            body.email, body.pwd_hash, body.name
        )
    except SupabaseAuthError as exc:
        if exc.code == "EMAIL_ALREADY_EXISTS":
            raise HTTPException(
                status_code=409,
                detail=ErrorResponse(
                    error=ErrorBody(code=exc.code, message=exc.message)
                ).model_dump(),
            ) from exc
        raise HTTPException(
            status_code=exc.status_code,
            detail=ErrorResponse(
                error=ErrorBody(code=exc.code, message=exc.message)
            ).model_dump(),
        ) from exc

    # メール確認待ちの場合はユーザーをDBに登録しないかもしれないので try/except で吸収する
    if auth_result.email_confirmation_required or not auth_result.access_token:
        # ユーザーIDが確定していない（ダミー UUID）場合は DB 登録をスキップ
        try:
            user = User(
                user_id=auth_result.user_id,
                type="User",
                name=body.name,
                e_mail=body.email,
                pwd_hash=body.pwd_hash,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
        return AuthResponse(
            accessToken=None,
            requiresEmailConfirmation=True,
            message=_register_confirmation_message(),
            user=UserResponse(id="", name=body.name, email=body.email),
        )

    user = User(
        user_id=auth_result.user_id,
        type="User",
        name=body.name,
        e_mail=body.email,
        pwd_hash=body.pwd_hash,
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        user = await ensure_user_record(
            db,
            auth_result,
            pwd_hash=body.pwd_hash,
        )
        user.name = body.name
        await db.commit()
        await db.refresh(user)

    return AuthResponse(
        accessToken=auth_result.access_token,
        user=_user_response(user),
    )
