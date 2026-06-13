// React import not required with new JSX transform

/**
 * 地図表示エリア。
 * 親要素の高さいっぱいに広がる前提のレイアウト（h-full / w-full）。
 * 将来的に react-leaflet (OpenStreetMap) のマップに置き換え、
 * ピン・ルート・混雑情報・現在地レイヤーなどをここに重ねる。
 */
export default function MapSection() {
  return (
    <div className="relative h-full w-full bg-gradient-to-b from-gray-100 to-gray-50">
      <div className="flex h-full w-full items-center justify-center text-center text-gray-400">
        <div>
          <p className="text-sm">地図表示エリア</p>
          <p className="text-xs">OpenStreetMap (react-leaflet) をここに実装</p>
        </div>
      </div>
    </div>
  )
}
