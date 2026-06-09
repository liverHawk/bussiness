# デプロイガイド

## デプロイ先一覧

| レイヤー | サービス | 備考 |
|---------|---------|------|
| Frontend + Backend | XServer VPS | Docker で同一サーバー内に配置 |
| DB | Supabase | PostgreSQL（外部マネージド） |
| CI/CD | GitHub Actions | `main` への push で自動デプロイ |

環境変数（`.env`）は **Git には含めず、VPS 上に直接配置** する。

---

## システム構成（本番）

```
[ブラウザ]
    │
    ▼ HTTPS
[XServer VPS]
├── Nginx（リバースプロキシ）
├── Docker: frontend（Next.js）
├── Docker: backend（FastAPI）
├── backend/.env        ← VPS上に配置
└── frontend/.env.local ← VPS上に配置
    │
    │ DATABASE_URL（asyncpg）
    ▼
[Supabase]  PostgreSQL
```

ローカル開発では `docker-compose.yml` で PostgreSQL コンテナも起動するが、本番では DB は Supabase のみを使う。

---

## デプロイ順序

```
① Supabase で DB を作成
      ↓
② XServer VPS を用意（Docker / Docker Compose インストール）
      ↓
③ VPS にリポジトリを clone、.env を配置
      ↓
④ 初回デプロイ（docker compose up --build -d）
      ↓
⑤ GitHub Actions のデプロイワークフローを設定
      ↓
⑥ push で自動再デプロイを確認
```

---

## ① Supabase（DB）

1. [supabase.com](https://supabase.com) → 新規プロジェクト作成
2. **Settings → Database → Connection string → URI** をコピー

   コピーした文字列:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

3. **`postgresql` → `postgresql+asyncpg`** に変更する（asyncpg 用）:
   ```
   postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

この接続文字列を VPS 上の `backend/.env` の `DATABASE_URL` に設定する。

---

## ② XServer VPS の初期セットアップ

### 必要なもの

- XServer VPS 契約済みサーバー
- SSH 接続情報
- ドメイン（任意。IP 直アクセスでも可）

### VPS にインストールするもの

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose（v2）
# Docker 公式インストールスクリプトに含まれる場合あり
docker compose version
```

### リポジトリの配置

```bash
ssh user@your-vps-ip

git clone <repo-url> /opt/58hack-in-omu
cd /opt/58hack-in-omu
```

---

## ③ 環境変数の配置（VPS）

`.env` ファイルは **VPS 上に直接作成** し、リポジトリにはコミットしない。

### backend/.env

```bash
# VPS 上で作成
nano /opt/58hack-in-omu/backend/.env
```

```env
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
ALLOWED_ORIGINS=https://your-domain.com
```

### frontend/.env.local

```bash
nano /opt/58hack-in-omu/frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

> フロントとバックを同一ドメインで Nginx が振り分ける場合、`NEXT_PUBLIC_API_URL` は `/api` プレフィックス付きの URL にする。  
> サブドメインで分ける場合は `https://api.your-domain.com` のように設定する。

---

## ④ 初回デプロイ

本番用の Docker Compose（DB コンテナなし）で起動する。

```bash
cd /opt/58hack-in-omu

# 本番用 compose ファイルでビルド・起動
docker compose -f docker-compose.prod.yml up --build -d

# 状態確認
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

`/health` にアクセスして `{"status":"ok"}` が返れば Backend は正常。

---

## ⑤ GitHub Actions による CI/CD

`main` ブランチへの push をトリガーに、テスト後に VPS へ SSH 接続して Docker を再デプロイする。

### フロー

```
git push (main)
    │
    ├─ backend-ci.yml   … pytest
    ├─ frontend-ci.yml  … lint + build
    │
    └─ deploy.yml       … VPS へ SSH → git pull → docker compose up --build -d
```

### GitHub Secrets に登録する値

| Secret 名 | 内容 |
|-----------|------|
| `VPS_HOST` | VPS の IP アドレスまたはホスト名 |
| `VPS_USER` | SSH ユーザー名 |
| `VPS_SSH_KEY` | デプロイ用 SSH 秘密鍵（PEM 形式） |

### デプロイワークフロー

`.github/workflows/deploy.yml` が `main` への push をトリガーに VPS へ SSH 接続し、以下を実行する。

1. `git pull origin main`
2. `frontend/.env.local` から `NEXT_PUBLIC_API_URL` を読み込み（フロントのビルド用）
3. `docker compose -f docker-compose.prod.yml up --build -d`
4. 未使用 Docker イメージの削除

> `.env` は VPS 上に常駐するため、`git pull` では上書きされない。  
> 環境変数を変更した場合は VPS 上で `.env` を編集し、手動で `docker compose -f docker-compose.prod.yml up --build -d` を実行する。

---

## Nginx（リバースプロキシ）

同一 VPS 内の Frontend / Backend を 1 つのドメインで公開する場合、Nginx で振り分ける。

```nginx
# /etc/nginx/sites-available/58hack-in-omu
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

HTTPS は Let's Encrypt（certbot）で設定する。

---

## 本番環境変数まとめ

### VPS: backend/.env

```env
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
ALLOWED_ORIGINS=https://your-domain.com
```

### VPS: frontend/.env.local

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

## GitHub Actions CI

PR や push のたびに自動でテスト・lint が走る。

| ワークフロー | トリガー | 内容 |
|------------|---------|------|
| `backend-ci.yml` | `backend/` 変更時 | pytest 実行 |
| `frontend-ci.yml` | `frontend/` 変更時 | lint + build チェック |
| `deploy.yml` | `main` への push | VPS へ SSH デプロイ |

`.github/workflows/` に定義する。GitHub 連携後は自動で動く。

---

## 運用メモ

### 手動で再デプロイする場合

```bash
ssh user@your-vps-ip
cd /opt/58hack-in-omu
git pull origin main
docker compose -f docker-compose.prod.yml up --build -d
```

### ログの確認

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### ロールバック

```bash
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml up --build -d
```
