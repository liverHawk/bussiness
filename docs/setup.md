# ローカル環境構築ガイド

ローカル開発は Docker Compose で行う。本番環境（XServer VPS + Supabase）の構築手順は [deployment.md](deployment.md) を参照。

## 必要なもの

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — これだけあればOK
- Git

---

## 手順

### 1. リポジトリをクローン

```bash
git clone <repo-url>
cd 58-in-omu
```

### 2. 環境変数ファイルを作成

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

> デフォルト値のままローカルで動作します。変更不要です。

### 3. 起動

```bash
docker-compose up --build
```

初回はDockerイメージのビルドとnpm installが走るため **3〜5分** かかります。  
`Starting development server` が表示されたら準備完了。

---

## 各サービスのURL

| サービス | URL | 説明 |
|---------|-----|------|
| Frontend | http://localhost:3000 | Next.js アプリ |
| Backend API | http://localhost:8000 | FastAPI |
| Swagger UI | http://localhost:8000/docs | APIドキュメント（自動生成） |
| Adminer | http://localhost:8080 | DB管理UI |

---

## DB管理（Adminer）

http://localhost:8080 にアクセスして以下でログイン:

| 項目 | 値 |
|------|-----|
| システム | PostgreSQL |
| サーバ | `db` |
| ユーザ名 | `postgres` |
| パスワード | `postgres` |
| データベース | `app_db` |

---

## ホットリロード

ファイルを保存すると自動で反映されます。

- **Backend** (`backend/app/` 以下): uvicornが自動リスタート
- **Frontend** (`frontend/src/` 以下): Next.js HMRが適用

---

## テスト実行

```bash
# バックエンドテスト（pytest）
docker-compose exec backend uv run pytest

# 詳細表示
docker-compose exec backend uv run pytest -v

# フロントエンドlint
docker-compose exec frontend npm run lint
```

---

## よく使うコマンド

```bash
# 起動
docker-compose up

# バックグラウンドで起動
docker-compose up -d

# ログを見る
docker-compose logs -f backend
docker-compose logs -f frontend

# 停止（データ保持）
docker-compose down

# 停止 + DBデータも削除
docker-compose down -v

# コンテナ内でコマンドを実行
docker-compose exec backend uv run pytest
docker-compose exec backend uv run python -c "print('hello')"
docker-compose exec frontend npm run lint

# 依存パッケージを追加した後はリビルドが必要
docker-compose up --build
```

---

## パッケージ追加方法

### Backend（Python）

```bash
# pyproject.toml を編集してから
docker-compose up --build backend
```

または、`pyproject.toml` の `dependencies` に直接追記してリビルドする。

### Frontend（Node.js）

```bash
# package.json を編集してから
docker-compose up --build frontend
```

---

## トラブルシューティング

### ポートが使用中のエラー
```bash
# 使用中のポートを確認して別プロセスを終了するか、docker-compose.ymlのポートを変更する
lsof -i :8000   # Mac/Linux
netstat -ano | findstr :8000  # Windows
```

### DBに接続できない
```bash
# dbコンテナの状態を確認
docker-compose ps
docker-compose logs db
```

### キャッシュを完全クリアして再ビルド
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```
