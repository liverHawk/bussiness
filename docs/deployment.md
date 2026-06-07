# デプロイガイド

## デプロイ先一覧

| レイヤー | サービス | 無料枠 |
|---------|---------|--------|
| DB | Supabase | あり |
| Backend | Railway | あり（$5クレジット/月） |
| Frontend | Vercel | あり |

---

## デプロイ順序

```
① Supabase でDBを作成
      ↓
② Railway にBackendをデプロイ
      ↓
③ Vercel にFrontendをデプロイ
      ↓
④ RailwayのCORSにVercelのURLを追加
```

---

## ① Supabase（DB）

1. [supabase.com](https://supabase.com) → 新規プロジェクト作成
2. **Settings → Database → Connection string → URI** をコピー

   コピーした文字列:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

3. **`postgresql` → `postgresql+asyncpg`** に変更する（asyncpg用）:
   ```
   postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

この接続文字列を次のRailwayの `DATABASE_URL` に使う。

---

## ② Railway（Backend）

1. [railway.app](https://railway.app) → 新規プロジェクト作成
2. **Deploy from GitHub repo** → このリポジトリを選択
3. **Root Directory** に `backend` を指定
4. **Variables** タブで以下を設定:

   | 変数名 | 値 |
   |--------|-----|
   | `DATABASE_URL` | Supabaseの接続文字列（asyncpg形式） |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app`（Vercelデプロイ後に更新） |

5. デプロイが完了したらRailwayが発行するURLをメモ
   - 例: `https://your-app.railway.app`
   - `/health` にアクセスして `{"status":"ok"}` が返ればOK

> `railway.toml` の設定でDockerfileビルドが自動で使われます。

---

## ③ Vercel（Frontend）

1. [vercel.com](https://vercel.com) → 新規プロジェクト作成
2. **Import Git Repository** → このリポジトリを選択
3. **Root Directory** に `frontend` を指定
4. **Environment Variables** で以下を設定:

   | 変数名 | 値 |
   |--------|-----|
   | `NEXT_PUBLIC_API_URL` | RailwayのURL（例: `https://your-app.railway.app`） |

5. **Deploy** → デプロイ完了後にVercelが発行するURLをメモ
   - 例: `https://your-app.vercel.app`

---

## ④ CORSの更新（Railway）

1. Railwayのプロジェクト → **Variables**
2. `ALLOWED_ORIGINS` をVercelのURLに更新:
   ```
   https://your-app.vercel.app
   ```
3. 自動で再デプロイされる

---

## 本番環境変数まとめ

### Railway (Backend)
```env
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Vercel (Frontend)
```env
NEXT_PUBLIC_API_URL=https://your-app.railway.app
```

---

## GitHub Actions CI

PRやpushのたびに自動でテスト・lintが走ります。

| ワークフロー | トリガー | 内容 |
|------------|---------|------|
| `backend-ci.yml` | `backend/` 変更時 | pytest実行 |
| `frontend-ci.yml` | `frontend/` 変更時 | lint + buildチェック |

`.github/workflows/` に定義済みなので、GitHub連携後は自動で動きます。
