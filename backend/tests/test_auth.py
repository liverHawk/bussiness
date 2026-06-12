import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.main import app
from app.database import get_db
from app.models.user import User
from app.services.supabase_auth import (
    SupabaseAuthError,
    SupabaseAuthResult,
    SupabaseAuthService,
    get_supabase_auth_service,
)

USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


@pytest.fixture
def mock_auth_service() -> MagicMock:
    service = MagicMock(spec=SupabaseAuthService)
    service.sign_in = AsyncMock()
    service.sign_up = AsyncMock()
    return service


@pytest.fixture
async def auth_client(mock_db, mock_auth_service):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_supabase_auth_service] = lambda: mock_auth_service
    from httpx import ASGITransport, AsyncClient

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client, mock_db, mock_auth_service
    app.dependency_overrides.clear()


def _make_user() -> User:
    return User(
        user_id=USER_ID,
        type="User",
        name="テスト太郎",
        e_mail="test@example.com",
        pwd_hash="a" * 64,
    )


def _auth_result() -> SupabaseAuthResult:
    return SupabaseAuthResult(
        access_token="eyJhbGciOiJIUzI1NiIs...",
        user_id=USER_ID,
        email="test@example.com",
        name="テスト太郎",
    )


@pytest.mark.asyncio
async def test_login_success(auth_client):
    client, mock_db, mock_auth = auth_client
    mock_auth.sign_in.return_value = _auth_result()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = _make_user()
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = await client.post(
        "/auth/login",
        json={"loginId": "test@example.com", "pwd_hash": "a" * 64},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["accessToken"] == "eyJhbGciOiJIUzI1NiIs..."
    assert data["user"]["id"] == str(USER_ID)
    assert data["user"]["name"] == "テスト太郎"
    assert data["user"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_login_validation_error(auth_client):
    client, _, _ = auth_client

    response = await client.post(
        "/auth/login",
        json={"loginId": "", "pwd_hash": "a" * 64},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert any(d["field"] == "loginId" for d in body["error"]["details"])


@pytest.mark.asyncio
async def test_login_invalid_credentials(auth_client):
    client, mock_db, mock_auth = auth_client
    mock_auth.sign_in.side_effect = SupabaseAuthError(
        "INVALID_CREDENTIALS",
        "メールアドレスまたはパスワードが正しくありません",
        401,
    )
    mock_db.execute = AsyncMock()

    response = await client.post(
        "/auth/login",
        json={"loginId": "test@example.com", "pwd_hash": "wrong" * 8},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_register_success(auth_client):
    client, mock_db, mock_auth = auth_client
    mock_auth.sign_up.return_value = _auth_result()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    response = await client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "pwd_hash": "a" * 64,
            "name": "テスト太郎",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "accessToken" in data
    assert data["user"]["email"] == "test@example.com"
    mock_db.add.assert_called_once()


@pytest.mark.asyncio
async def test_register_validation_error(auth_client):
    client, _, _ = auth_client

    response = await client.post(
        "/auth/register",
        json={"email": "invalid-email", "pwd_hash": "a" * 64, "name": "太郎"},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert any(d["field"] == "email" for d in body["error"]["details"])


@pytest.mark.asyncio
async def test_register_email_already_exists_in_db(auth_client):
    client, mock_db, _ = auth_client
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = _make_user()
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = await client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "pwd_hash": "a" * 64,
            "name": "テスト太郎",
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_register_email_already_exists_in_supabase(auth_client):
    client, mock_db, mock_auth = auth_client
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_auth.sign_up.side_effect = SupabaseAuthError(
        "EMAIL_ALREADY_EXISTS",
        "このメールアドレスは既に登録されています",
        409,
    )

    response = await client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "pwd_hash": "a" * 64,
            "name": "テスト太郎",
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"
