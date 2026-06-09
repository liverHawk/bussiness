# API仕様

ベースURL（ローカル）: `http://localhost:8000`  
ベースURL（本番）: `https://your-domain.com/api`（XServer VPS + Nginx）

インタラクティブドキュメント: `{BASE_URL}/docs` (Swagger UI)

---

## エンドポイント

### GET /health

サービスの死活確認。

**レスポンス**
```json
{
  "status": "ok"
}
```

| コード | 説明 |
|--------|------|
| 200 | 正常 |

---

> 新しいエンドポイントを追加する場合は `backend/app/routers/` にルーターを作成し、`main.py` で `include_router` する。
