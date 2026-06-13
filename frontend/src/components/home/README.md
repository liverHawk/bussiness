Home screen components for 混雑予想Map

This folder contains presentational and client components used by the Next.js App Router page at `frontend/src/app/page.tsx`.

## Screens

- `HomeScreen.tsx` — トップ画面（親画面）。Header + ルート検索ボタン + 検索バー + 地図のみのシンプルな構成。`frontend/src/app/page.tsx` のエントリーポイント。
- `RouteSearchScreen.tsx` — ルート検索の詳細入力画面（出発地・目的地・時刻指定など）。`HomeScreen` の「ルート検索」ボタンから遷移する想定。

## Extension points

- Routing: `HomeScreen` の `handleRouteSearchClick` / `handleSearchClick` / `handleFilterClick` に、それぞれ詳細画面・地点検索・フィルター画面への遷移処理を実装する。
- API: `RouteSearchScreen.handleSearch` の console.log を `frontend/src/lib/api.ts` の呼び出し（例: `searchRoute(form)`）に置き換える。
- Map: `MapSection` の中身を React Leaflet (OpenStreetMap) に置き換える。`MapSection` は親要素の高さに追従する (`h-full w-full`) ため、配置先のレイアウトはそのまま使える。
- Time & AI: `TimeSelectorSheet` currently manages visual state; wire its values into `RouteSearchScreen` and pass the `form` to backend AI endpoints.

## Design notes

- Colors: base `#fffbf7`, accent `#d3883f`.
- Components are intentionally small and focused to ease team work during the hackathon.
