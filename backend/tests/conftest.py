"""
テスト用共通フィクスチャ

ローカルで DB を起動していなくてもテストが通るように、
get_db を AsyncMock に差し替える仕組みを提供する。

使い方:
  - DB を使わないエンドポイントのテスト → `client` フィクスチャをそのまま使う
  - DB を使うエンドポイントのテスト    → `client` + `mock_db` を組み合わせて使う

  例:
      async def test_create_item(client, mock_db):
          mock_db.execute.return_value = ...
          response = await client.post("/items", json={"name": "test"})
          assert response.status_code == 201
"""

import pytest
from unittest.mock import AsyncMock
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.database import get_db


@pytest.fixture
def mock_db():
    """DB セッションのモック（AsyncSession の代わり）"""
    session = AsyncMock()
    # よく使うメソッドのデフォルト戻り値
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    return session


@pytest.fixture
async def client(mock_db):
    """
    DB 接続なしで動く HTTP テストクライアント。
    get_db を mock_db で上書きしてから yield する。
    """
    app.dependency_overrides[get_db] = lambda: mock_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()
