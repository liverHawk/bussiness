"use client"

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Spot, SpotCategory } from '@/lib/spots'
import { getCongestionColor, getCongestionLabel } from '@/lib/congestion'

// Next.js のバンドラーがデフォルトマーカー画像を解決できないため明示的に設定
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
})

// 大阪公立大学 杉本キャンパス周辺
const CENTER: [number, number] = [34.5446, 135.5064]

const CATEGORY_EMOJI: Record<SpotCategory, string> = {
  restaurant: '🍴',
  tourist: '📷',
  facility: '🏛️',
}

const CATEGORY_LABEL: Record<SpotCategory, string> = {
  restaurant: '飲食店',
  tourist: '観光地',
  facility: '施設',
}

// 混雑度に応じて色付けしたピンアイコンを生成
function createPinIcon(color: string, emoji: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:30px;height:40px;">
        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 12.2 23.3 13.9 24.9a1.5 1.5 0 0 0 2.2 0C17.8 38.3 30 25.5 30 15 30 6.7 23.3 0 15 0z" fill="${color}" stroke="#fff" stroke-width="1.5" />
          <circle cx="15" cy="15" r="9" fill="#fff" />
        </svg>
        <div style="position:absolute;top:2px;left:0;width:30px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;">${emoji}</div>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  })
}

type Props = {
  showCongestion?: boolean
  spots?: Spot[]
}

export default function LeafletMap({ showCongestion = false, spots = [] }: Props) {
  return (
    <MapContainer center={CENTER} zoom={15} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showCongestion &&
        spots.map((spot) => (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={createPinIcon(getCongestionColor(spot.congestion), CATEGORY_EMOJI[spot.category])}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{spot.name}</p>
                <p className="text-gray-500">{CATEGORY_LABEL[spot.category]}</p>
                <p className="mt-1">混雑状況: {getCongestionLabel(spot.congestion)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}
