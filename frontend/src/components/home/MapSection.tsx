"use client"

import dynamic from 'next/dynamic'
import CongestionLegend from './CongestionLegend'
import type { Spot } from '@/lib/spots'

// Leaflet は window に依存するため SSR では動かない
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-gray-100 to-gray-50 text-center text-gray-400">
      <p className="text-sm">地図を読み込み中...</p>
    </div>
  ),
})

type Props = {
  showCongestion?: boolean
  spots?: Spot[]
}

/**
 * 地図表示エリア。
 * 親要素の高さいっぱいに広がる前提のレイアウト（h-full / w-full）。
 * OpenStreetMap (react-leaflet) を表示する。
 * showCongestion が true のとき、渡された spots を混雑状況ピンと凡例で表示する。
 */
export default function MapSection({ showCongestion = false, spots = [] }: Props) {
  return (
    <div className="relative h-full w-full">
      <LeafletMap showCongestion={showCongestion} spots={spots} />
      {showCongestion && <CongestionLegend />}
    </div>
  )
}
