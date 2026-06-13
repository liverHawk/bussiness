from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.errors import ErrorBody, ErrorResponse
from app.services.supabase_auth import (
    SupabaseAuthError,
    SupabaseAuthResult,
    SupabaseAuthService,
    get_supabase_auth_service,
)

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=ErrorResponse(
            error=ErrorBody(code=code, message=message)
        ).model_dump(),
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> SupabaseAuthResult:
    """Authorization ヘッダーの Bearer トークンを検証し、ユーザーを返す。"""
    if credentials is None or not credentials.credentials:
        raise _unauthorized("UNAUTHORIZED", "認証が必要です")
    # トークンがある場合のみ Supabase サービスを取得する
    # （未設定環境でもトークン無しは 401 を返せるようにするため）
    auth_service: SupabaseAuthService = get_supabase_auth_service()
    try:
        return await auth_service.get_user(credentials.credentials)
    except SupabaseAuthError as exc:
        raise _unauthorized(exc.code, exc.message) from exc
