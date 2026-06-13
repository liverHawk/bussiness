---
name: frontend-hmr-onedrive-restart
description: Frontend HMR doesn't pick up edits because the repo lives on a OneDrive-mounted path; restart the container after editing
metadata:
  type: project
---

リポジトリが OneDrive 配下（`C:\Users\weihu\OneDrive - 公立大学法人大阪\...`）にあり、Docker の frontend コンテナはこのパスをマウントしている。Next.js dev の file watcher が OneDrive マウント上の変更を拾わないため、ソース編集が HMR で反映されず**古いコード／未スタイルの状態が配信される**ことがある。

**Why:** 編集後にブラウザ確認すると旧バージョンが出て、検証結果を誤認する。

**How to apply:** フロント編集後にブラウザで確認する前に `docker compose restart frontend` を実行し、初回リクエストでコンパイルさせる（`curl localhost:3000/...` でプライム）。型チェックは `docker compose exec -T frontend npx tsc --noEmit` で可能（ローカルに node_modules は無いため IDE の JSX エラーは環境ノイズ）。
