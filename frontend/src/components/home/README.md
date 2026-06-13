Home screen components for 混雑予想Map

This folder contains presentational and client components used by the Next.js App Router page at `frontend/src/app/page.tsx`.

## Screens

- `HomeScreen.tsx` — トップ画面（親画面）。Header + ルート検索ボタン + 検索バー + 地図のみのシンプルな構成。`frontend/src/app/page.tsx` のエントリーポイント。
- `RouteSearchScreen.tsx` — ルート検索の詳細入力画面（出発地・目的地・時刻指定など）。`HomeScreen` の「ルート検索」ボタンから遷移する想定。「AIルート検索」ボタンを押すと `/route-result` (`RouteResultScreen`) に遷移する。
- `RouteResultScreen.tsx` — AIルート検索の結果画面。出発地・行きたいところのチップ、ルートを表示する地図 (`RouteMap`)、到着予定・所要時間などの概要カード、下部の「ルート詳細」「保存」ボタンで構成。「ルート詳細」を押すと概要チップ/カードが隠れて地図のルート表示が強調され、下からおすすめルートの詳細シート（タイムライン）が表示される。「保存」を押すと「保存済み」（オレンジ背景・白文字）に切り替わる。`frontend/src/app/route-result/page.tsx` のエントリーポイント。

## Extension points

- Routing: `HomeScreen` の `handleRouteSearchClick` / `handleFilterClick` に、それぞれ詳細画面・フィルター画面への遷移処理を実装する。
- API: `RouteSearchScreen.handleSearch` の console.log を `frontend/src/lib/api.ts` の呼び出し（例: `searchRoute(form)`）に置き換える。
- Map: `MapSection` は React Leaflet (`LeafletMap`) を使って OpenStreetMap を表示する。親要素の高さに追従する (`h-full w-full`) ため、配置先のレイアウトはそのまま使える。
- Time & AI: `TimeSelectorSheet` currently manages visual state; wire its values into `RouteSearchScreen` and pass the `form` to backend AI endpoints.
- Route result: `frontend/src/lib/routeResult.ts` の `ROUTE_RESULT` はモックデータ。実際の検索結果に置き換える際は `RouteResultScreen` / `RouteMap` の props 形状 (`RouteResultData`) はそのまま使える。

## Congestion visualization (混雑状況の可視化)

- `frontend/src/lib/congestion.ts` — 4段階の混雑レベルと色 (`CONGESTION_LEVELS`) を定義。背景色 `#fffbf7` / メインカラー `#d3883f` と馴染む暖色グラデーション。
- `frontend/src/lib/spots.ts` — 飲食店・観光地のピン用モックデータ (`SPOTS`)。実データ取得 API ができたら差し替える。
- `LeafletMap` の `showCongestion` prop が `true` のとき、`SPOTS` を混雑レベルに応じた色のピン（`Marker` + `divIcon`）として表示し、タップで店名・カテゴリ・混雑状況を `Popup` 表示する。
- `MapSection` の `showCongestion` prop が `true` のとき、左下に `CongestionLegend`（凡例）を重ねて表示する。
- `HomeScreen` の検索バー押下 (`handleSearchClick`) と `RouteSearchScreen` の「AIルート検索」押下 (`handleSearch`) で `showCongestion` を切り替え、混雑状況ピンを可視化する。

## Design notes

- Colors: base `#fffbf7`, accent `#d3883f`.
- Components are intentionally small and focused to ease team work during the hackathon.
