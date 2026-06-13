"use client"

import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { RouteResultData } from '@/lib/routeResult'

// Next.js のバンドラーがデフォルトマーカー画像を解決できないため明示的に設定
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
})

function createDotIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function createWaypointIcon(emoji: string, label: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="display:flex;align-items:center;gap:4px;background:#fff;border-radius:9999px;padding:4px 9px;font-size:11px;font-weight:600;white-space:nowrap;color:#2f2419;box-shadow:0 1px 4px rgba(0,0,0,0.18);">
          <span>${emoji}</span><span>${label}</span>
        </div>
        <div style="width:10px;height:10px;border-radius:50%;background:#d3883f;border:2px solid #fff;margin-top:3px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [5, 12],
  })
}

function createEndIcon(label: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="background:#e2533c;color:#fff;border-radius:9999px;padding:4px 10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.22);">${label}</div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #e2533c;margin-top:-1px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [5, 20],
  })
}

type Props = {
  data: RouteResultData
  simplified?: boolean
}

/**
 * AIルート検索の結果用マップ。
 * 出発地から目的地までのルートを線で表示し、立ち寄りスポットをピンで示す。
 * simplified が true のとき、立ち寄りスポットのラベルを隠してルートのみを強調する。
 */
export default function RouteMap({ data, simplified = false }: Props) {
  return (
    <MapContainer
      bounds={data.path}
      boundsOptions={{ padding: [32, 32] }}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline
        positions={data.path}
        pathOptions={{ color: '#3b82f6', weight: simplified ? 6 : 4, opacity: simplified ? 0.95 : 0.85 }}
      />
      <Marker position={data.startPosition} icon={createDotIcon('#3b82f6')} />
      {!simplified &&
        data.waypoints.map((w) => (
          <Marker key={w.id} position={[w.lat, w.lng]} icon={createWaypointIcon(w.emoji, w.arrival)} />
        ))}
      <Marker position={data.endPosition} icon={createEndIcon(data.finalDestinationName)} />
    </MapContainer>
  )
}
