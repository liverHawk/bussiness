from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.user import UserMeResponse
from app.services.supabase_auth import SupabaseAuthResult
from app.services.user_sync import ensure_user_record

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
async def get_me(
    current_user: SupabaseAuthResult = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMeResponse:
    """ログイン中ユーザーの情報（名前・保有コイン）を返す。"""
    user = await ensure_user_record(db, current_user)

    return UserMeResponse(
        userId=str(user.user_id),
        username=user.name,
        currentTotalCoins=user.coin,
    )
