# 58 in OMU

FastAPI × Next.js × Supabase のモノレポベーステンプレート。

## スタック

| レイヤー | 技術 | デプロイ先 |
|---------|------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS | Vercel |
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2.x | Railway |
| DB | PostgreSQL (Supabase) | Supabase |

## クイックスタート（Docker）

```bash
git clone <repo-url>
cd 58-in-omu

cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

docker-compose up --build
```

| サービス | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| DB 管理 (Adminer) | http://localhost:8080 |

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [CLAUDE.md](CLAUDE.md) | AIアシスタント向けコンテキスト（Cursor / Copilot / Claude） |
| [docs/setup.md](docs/setup.md) | ローカル環境構築・よく使うコマンド |
| [docs/development.md](docs/development.md) | 機能追加の方法・開発ガイド |
| [docs/architecture.md](docs/architecture.md) | システム構成・技術選定理由 |
| [docs/api.md](docs/api.md) | APIエンドポイント仕様 |
| [docs/deployment.md](docs/deployment.md) | Railway / Vercel / Supabase デプロイ手順 |

## テスト

```bash
docker-compose exec backend uv run pytest
docker-compose exec frontend npm run lint
```
