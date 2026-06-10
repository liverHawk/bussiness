import pytest


@pytest.mark.asyncio
async def test_health(client):
    """GET /health が {"status": "ok"} を返すこと（DB不要）"""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
