from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.errors import ErrorBody, ErrorResponse
from app.schemas.user import UserMeResponse
from app.services.supabase_auth import SupabaseAuthResult

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
async def get_me(
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMeResponse:
    """ログイン中ユーザーの情報（名前・保有コイン）を返す。"""
    result = await db.execute(
        select(User).where(User.user_id == current_user.user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorBody(code="USER_NOT_FOUND", message="ユーザーが見つかりません")
            ).model_dump(),
        )

    return UserMeResponse(
        userId=str(user.user_id),
        username=user.name,
        currentTotalCoins=user.coin,
    )
