from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.schemas.errors import ErrorBody, ErrorResponse
from app.services.supabase_auth import (
    SupabaseAuthError,
    SupabaseAuthService,
    get_supabase_auth_service,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(id=str(user.user_id), name=user.name, email=user.e_mail)


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

    result = await db.execute(select(User).where(User.e_mail == body.loginId))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            user_id=auth_result.user_id,
            type="User",
            name=auth_result.name,
            e_mail=auth_result.email,
            pwd_hash=body.pwd_hash,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif user.user_id != auth_result.user_id:
        user.user_id = auth_result.user_id
        await db.commit()
        await db.refresh(user)

    return AuthResponse(
        accessToken=auth_result.access_token,
        user=_user_response(user),
    )


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

    return AuthResponse(
        accessToken=auth_result.access_token,
        user=_user_response(user),
    )
