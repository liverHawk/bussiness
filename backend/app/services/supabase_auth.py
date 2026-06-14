import uuid
from dataclasses import dataclass

import httpx

from app.config import settings


class SupabaseAuthError(Exception):
    def __init__(self, code: str, message: str, status_code: int) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


@dataclass
class SupabaseAuthResult:
    access_token: str | None
    user_id: uuid.UUID
    email: str
    name: str
    email_confirmation_required: bool = False


class SupabaseAuthService:
    """Supabase Auth REST API を利用した認証サービス。"""

    def __init__(self, url: str, anon_key: str) -> None:
        self._base_url = url.rstrip("/")
        self._anon_key = anon_key
        self._headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Content-Type": "application/json",
        }

    async def get_user(self, access_token: str) -> SupabaseAuthResult:
        """ユーザーのアクセストークンを検証し、ユーザー情報を返す。"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self._base_url}/auth/v1/user",
                headers={
                    "apikey": self._anon_key,
                    "Authorization": f"Bearer {access_token}",
                },
            )

        if response.status_code == 200:
            data = response.json()
            user_id = data.get("id")
            if not user_id:
                raise SupabaseAuthError("INVALID_TOKEN", "認証に失敗しました", 401)
            metadata = data.get("user_metadata") or {}
            return SupabaseAuthResult(
                access_token=access_token,
                user_id=uuid.UUID(user_id),
                email=data.get("email") or "",
                name=metadata.get("name") or "",
            )

        raise SupabaseAuthError("INVALID_TOKEN", "認証に失敗しました", 401)

    async def sign_out(self, access_token: str) -> None:
        """ユーザーのアクセストークンを無効化（ログアウト）する。"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self._base_url}/auth/v1/logout",
                headers={
                    "apikey": self._anon_key,
                    "Authorization": f"Bearer {access_token}",
                },
            )
        # 204 No Content が正常。401 でも「既に無効」とみなし黙殺する。
        if response.status_code not in (200, 204, 401):
            raise SupabaseAuthError(
                "AUTH_ERROR", "ログアウト処理に失敗しました", response.status_code
            )

    async def sign_up(self, email: str, password: str, name: str) -> SupabaseAuthResult:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self._base_url}/auth/v1/signup",
                headers=self._headers,
                json={
                    "email": email,
                    "password": password,
                    "data": {"name": name},
                },
            )
        return self._parse_signup_response(response, email=email, fallback_name=name)

    def _extract_user_and_token(self, data: dict) -> tuple[dict, str | None]:
        user = data.get("user")
        if user is None and data.get("id"):
            user = data
        user = user or {}
        token = data.get("access_token")
        session = data.get("session")
        if not token and isinstance(session, dict):
            token = session.get("access_token")
        return user, token

    def _parse_signup_response(
        self,
        response: httpx.Response,
        email: str,
        fallback_name: str = "",
    ) -> SupabaseAuthResult:
        if response.status_code == 200:
            data = response.json()
            user, token = self._extract_user_and_token(data)
            metadata = user.get("user_metadata") or {}
            user_id = user.get("id")

            # Supabase がメール確認有効時に {"user": null, "session": null} を返すケース。
            # ダミー UUID を生成してメール確認待ちとして扱う。
            if not user_id:
                return SupabaseAuthResult(
                    access_token=None,
                    user_id=uuid.uuid4(),
                    email=email,
                    name=fallback_name,
                    email_confirmation_required=True,
                )

            if not token:
                return SupabaseAuthResult(
                    access_token=None,
                    user_id=uuid.UUID(user_id),
                    email=user.get("email") or email,
                    name=metadata.get("name") or fallback_name,
                    email_confirmation_required=True,
                )
            return SupabaseAuthResult(
                access_token=token,
                user_id=uuid.UUID(user_id),
                email=user.get("email") or email,
                name=metadata.get("name") or fallback_name,
            )

        body = response.json() if response.content else {}
        error_code = body.get("error_code", "")
        msg = body.get("msg") or body.get("message") or ""

        if error_code == "user_already_exists" or "already registered" in msg.lower():
            raise SupabaseAuthError(
                "EMAIL_ALREADY_EXISTS",
                "このメールアドレスは既に登録されています",
                409,
            )

        if error_code == "weak_password" or "password" in msg.lower():
            raise SupabaseAuthError(
                "WEAK_PASSWORD",
                "パスワードが弱すぎます。より強いパスワードを設定してください",
                400,
            )

        raise SupabaseAuthError(
            "AUTH_ERROR",
            msg or "認証処理に失敗しました",
            response.status_code if response.status_code >= 400 else 500,
        )

    async def sign_in(self, email: str, password: str) -> SupabaseAuthResult:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self._base_url}/auth/v1/token?grant_type=password",
                headers=self._headers,
                json={"email": email, "password": password},
            )
        return self._parse_auth_response(response, email=email)

    def _parse_auth_response(
        self,
        response: httpx.Response,
        email: str,
        fallback_name: str = "",
    ) -> SupabaseAuthResult:
        if response.status_code == 200:
            data = response.json()
            user, token = self._extract_user_and_token(data)
            metadata = user.get("user_metadata") or {}
            user_id = user.get("id")
            if not token or not user_id:
                raise SupabaseAuthError(
                    "AUTH_ERROR",
                    "認証処理に失敗しました",
                    500,
                )
            return SupabaseAuthResult(
                access_token=token,
                user_id=uuid.UUID(user_id),
                email=user.get("email") or email,
                name=metadata.get("name") or fallback_name,
            )

        body = response.json() if response.content else {}
        error_code = body.get("error_code", "")
        msg = body.get("msg") or body.get("message") or ""

        if error_code == "user_already_exists" or "already registered" in msg.lower():
            raise SupabaseAuthError(
                "EMAIL_ALREADY_EXISTS",
                "このメールアドレスは既に登録されています",
                409,
            )

        if (
            error_code in ("invalid_credentials", "invalid_grant")
            or "invalid login credentials" in msg.lower()
        ):
            raise SupabaseAuthError(
                "INVALID_CREDENTIALS",
                "メールアドレスまたはパスワードが正しくありません",
                401,
            )

        if (
            error_code == "email_not_confirmed"
            or "email not confirmed" in msg.lower()
        ):
            raise SupabaseAuthError(
                "EMAIL_NOT_CONFIRMED",
                "メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください",
                403,
            )

        raise SupabaseAuthError(
            "AUTH_ERROR",
            msg or "認証処理に失敗しました",
            response.status_code,
        )


def get_supabase_auth_service() -> SupabaseAuthService:
    from fastapi import HTTPException

    from app.schemas.errors import ErrorBody, ErrorResponse

    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=503,
            detail=ErrorResponse(
                error=ErrorBody(
                    code="AUTH_NOT_CONFIGURED",
                    message="認証サービスが設定されていません（SUPABASE_URL / SUPABASE_ANON_KEY）",
                )
            ).model_dump(),
        )
    return SupabaseAuthService(settings.supabase_url, settings.supabase_anon_key)
