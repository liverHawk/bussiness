---
name: frontend-postcss-config-untracked
description: frontend/postcss.config.mjs is required for Tailwind v4 but is untracked in git, so it vanishes on branch switches and breaks all styling
metadata:
  type: project
---

`frontend/postcss.config.mjs`（`@tailwindcss/postcss` プラグインを登録）が **git 未追跡**のため、ブランチ切替/リセットのたびに消え、Tailwind v4 がユーティリティを一切生成しなくなる（全ページが未スタイル＝素のHTMLになる）。

**症状の見分け方:** 配信される `/_next/static/css/app/layout.css` が約 **32171 バイトでユーティリティ0個**（`.flex` 等が grep で 0 件）。`feat/store-reviews` ブランチでも再発した。

**Why:** スタイル崩れを「自分のコードのバグ」と誤認しやすい。実際は設定ファイル欠落。

**How to apply:** 崩れたら `ls frontend/postcss.config.*` を確認。無ければ以下を作成して `docker compose restart frontend`：
```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```
**恒久対策:** このファイルを git にコミットすれば再発しない（現状どのブランチでも未追跡）。関連: [[frontend-hmr-onedrive-restart]]
