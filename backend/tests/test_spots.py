import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import get_db
from app.dependencies import get_current_user
from app.main import app
from app.services.supabase_auth import SupabaseAuthResult

SPOT_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
CURRENT_USER = SupabaseAuthResult(
    access_token="token",
    user_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
    email="test@example.com",
    name="テスト太郎",
)


@pytest.fixture
def mock_db():
    session = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
async def client(mock_db):
    """認証を通した状態のクライアント。"""
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: CURRENT_USER
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c, mock_db
    app.dependency_overrides.clear()


def _row(**kwargs) -> SimpleNamespace:
    return SimpleNamespace(**kwargs)


def _set_rows(mock_db, rows) -> None:
    result = MagicMock()
    result.all.return_value = rows
    mock_db.execute.return_value = result


@pytest.mark.asyncio
async def test_search_returns_mapped_spots(client):
    c, mock_db = client
    _set_rows(
        mock_db,
        [
            _row(
                store_id=SPOT_ID,
                name="リバーサイドカフェ中之島",
                lat=34.6925,
                lon=135.5021,
                crowrd_level=0.1,
                category="カフェ",
                avg_rating=4.5,
            )
        ],
    )

    resp = await c.get("/spots/search?genre=cafe&congestion=empty&review=4.1-5.0")

    assert resp.status_code == 200
    spot = resp.json()["spots"][0]
    assert spot == {
        "spotId": str(SPOT_ID),
        "name": "リバーサイドカフェ中之島",
        "category": "カフェ",
        "latitude": 34.6925,
        "longitude": 135.5021,
        "congestionStatus": "空いている",
        "reviewRating": 4.5,
    }


@pytest.mark.asyncio
async def test_search_congestion_label_and_rating_rounding(client):
    c, mock_db = client
    _set_rows(
        mock_db,
        [
            _row(
                store_id=SPOT_ID,
                name="難波テラスコーヒー",
                lat=34.6655,
                lon=135.5015,
                crowrd_level=0.35,
                category="カフェ",
                avg_rating=3.84,
            )
        ],
    )

    resp = await c.get("/spots/search")

    spot = resp.json()["spots"][0]
    assert spot["congestionStatus"] == "少し空き"
    assert spot["reviewRating"] == 3.8


@pytest.mark.asyncio
async def test_search_handles_null_location_and_no_reviews(client):
    c, mock_db = client
    _set_rows(
        mock_db,
        [
            _row(
                store_id=SPOT_ID,
                name="タグ無しスポット",
                lat=None,
                lon=None,
                crowrd_level=None,
                category=None,
                avg_rating=0.0,
            )
        ],
    )

    resp = await c.get("/spots/search")

    spot = resp.json()["spots"][0]
    assert spot["latitude"] == 0.0
    assert spot["longitude"] == 0.0
    assert spot["category"] == ""
    assert spot["congestionStatus"] == "不明"
    assert spot["reviewRating"] == 0.0


@pytest.mark.asyncio
async def test_search_empty_result(client):
    c, mock_db = client
    _set_rows(mock_db, [])

    resp = await c.get("/spots/search")

    assert resp.status_code == 200
    assert resp.json() == {"spots": []}


@pytest.mark.asyncio
async def test_search_unknown_genre_returns_empty(client):
    c, mock_db = client
    _set_rows(mock_db, [_row()])  # 呼ばれない想定

    resp = await c.get("/spots/search?genre=unknown_genre")

    assert resp.status_code == 200
    assert resp.json() == {"spots": []}


@pytest.mark.asyncio
async def test_search_requires_auth(mock_db):
    """Authorization ヘッダー無しは 401。"""
    app.dependency_overrides[get_db] = lambda: mock_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        resp = await c.get("/spots/search")

    app.dependency_overrides.clear()
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"
