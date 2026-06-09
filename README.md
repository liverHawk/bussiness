# 58 in OMU

FastAPI × Next.js × Supabase のモノレポベーステンプレート。

## スタック

| レイヤー | 技術 | デプロイ先 |
|---------|------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS | XServer VPS（Docker） |
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2.x | XServer VPS（Docker） |
| DB | PostgreSQL (Supabase) | Supabase |

本番では Frontend / Backend を **同一 VPS 内の Docker コンテナ** で動かし、GitHub への push で自動再デプロイする。環境変数は VPS 上に直接配置する。

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
| [PRODUCT.md](PRODUCT.md) | プロダクト概要 |
| [CLAUDE.md](CLAUDE.md) | AI アシスタント向けコンテキスト（Cursor / Copilot / Claude） |
| [docs/setup.md](docs/setup.md) | ローカル環境構築・よく使うコマンド |
| [docs/development.md](docs/development.md) | 機能追加の方法・開発ガイド |
| [docs/architecture.md](docs/architecture.md) | システム構成・技術選定理由 |
| [docs/api.md](docs/api.md) | API エンドポイント仕様 |
| [docs/deployment.md](docs/deployment.md) | XServer VPS / Supabase / GitHub Actions デプロイ手順 |

## テスト

```bash
docker-compose exec backend uv run pytest
docker-compose exec frontend npm run lint
```
