"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Header from './Header'
import { ROUTE_RESULT, type RouteResultData } from '@/lib/routeResult'
import type { RouteGenerateResponse } from '@/lib/api'

const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-gray-100 to-gray-50 text-center text-gray-400">
      <p className="text-sm">地図を読み込み中...</p>
    </div>
  ),
})

function buildRouteResultData(api: RouteGenerateResponse): RouteResultData {
  const first = api.timeline[0]
  const last = api.timeline[api.timeline.length - 1]
  const departureName = first?.locationName ?? '出発地'
  const destinationNames = api.timeline.slice(1).map((t) => t.locationName)
  const finalDestinationName = last?.locationName ?? '目的地'

  const toTimeStr = (h: number, m: number) =>
    `${h}:${String(m).padStart(2, '0')}`

  const departureTime = first
    ? toTimeStr(first.estimatedHour, first.estimatedMinute)
    : '—'
  const arrivalTime = last
    ? toTimeStr(last.estimatedHour, last.estimatedMinute)
    : '—'

  const path: [number, number][] =
    api.path.length > 0
      ? (api.path as [number, number][])
      : api.timeline.map((t) => [t.latitude, t.longitude])

  const startPosition: [number, number] = [
    api.timeline[0]?.latitude ?? 0,
    api.timeline[0]?.longitude ?? 0,
  ]
  const endPosition: [number, number] = [
    last?.latitude ?? 0,
    last?.longitude ?? 0,
  ]

  const EMOJIS = ['☕', '🍃', '🏯', '🎨', '🌸']
  const waypoints = api.timeline.slice(1, -1).map((t, i) => ({
    id: `w${i + 1}`,
    name: t.locationName,
    emoji: EMOJIS[i % EMOJIS.length],
    arrival: toTimeStr(t.estimatedHour, t.estimatedMinute),
    stay: '約30分',
    lat: t.latitude,
    lng: t.longitude,
  }))

  const STEP_ICONS = ['🔵', '🚶', '☕', '🚶', '🍃', '🚶', '🔴']
  const timeline = api.timeline.map((t, i) => ({
    id: `t${i + 1}`,
    icon: STEP_ICONS[i % STEP_ICONS.length],
    title: t.locationName,
    subtitle: `${toTimeStr(t.estimatedHour, t.estimatedMinute)} ${t.actionLabel}`,
  }))

  const durationH = Math.floor(api.totalDuration / 60)
  const durationM = api.totalDuration % 60
  const durationLabel =
    durationH > 0 ? `約${durationH}時間${durationM}分` : `約${durationM}分`

  return {
    departureName,
    departureTime,
    destinationNames,
    finalDestinationName,
    arrivalTime,
    distanceKm: api.totalDistance,
    durationLabel,
    startPosition,
    endPosition,
    path,
    waypoints,
    timeline,
  }
}

export default function RouteResultScreen() {
  const [detailOpen, setDetailOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [data, setData] = useState<RouteResultData>(ROUTE_RESULT)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('routeResult')
      if (raw) {
        const api = JSON.parse(raw) as RouteGenerateResponse
        setData(buildRouteResultData(api))
      }
    } catch {
      // セッションデータが壊れていたらモックを使用
    }
  }, [])

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#fffbf7] text-[#2f2419]">
      <div className="flex flex-1 flex-col overflow-hidden pb-20">
        <div className="z-10 flex flex-col gap-3 px-4 pb-3 pt-3">
          <Header />

          {!detailOpen && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#d3883f] bg-white px-3 py-1.5 text-xs font-semibold text-[#d3883f]">
                出発 {data.departureName}
              </span>
              {data.destinationNames.map((name) => (
                <span key={name} className="flex items-center gap-2">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d3883f"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-none"
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                  <span className="rounded-full bg-[#d3883f] px-3 py-1.5 text-xs font-semibold text-white">
                    {name}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden">
          <RouteMap data={data} simplified={detailOpen} />
        </div>

        {!detailOpen && (
          <div className="px-4 pt-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">到着予定</p>
                  <p className="text-2xl font-bold text-[#2f2419]">{data.arrivalTime}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">所要時間・距離</p>
                  <p className="text-sm font-semibold text-[#2f2419]">
                    {data.durationLabel} ・ {data.distanceKm}km
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-[#9a6a3a]">
                <span className="rounded-full bg-[#fdf1e3] px-2.5 py-1">🚶 徒歩</span>
                <span className="rounded-full bg-[#fdf1e3] px-2.5 py-1">立ち寄り {data.waypoints.length}件</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {detailOpen && (
        <div className="absolute inset-x-0 bottom-0 z-10 max-h-[60vh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-24 pt-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />
          <p className="mb-1 text-xs font-semibold text-[#d3883f]">おすすめルート</p>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400">到着予定</p>
              <p className="text-3xl font-bold text-[#2f2419]">{data.arrivalTime}</p>
            </div>
            <p className="text-sm text-gray-500">
              {data.distanceKm}km ・ {data.durationLabel}
            </p>
          </div>
          <ul className="space-y-3">
            {data.timeline.map((step) => (
              <li key={step.id} className="flex items-start gap-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#fdf1e3] text-base">
                  {step.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#2f2419]">{step.title}</p>
                  {step.subtitle && <p className="text-xs text-gray-400">{step.subtitle}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-black/5 bg-[#fffbf7] px-4 py-3">
        <button
          type="button"
          onClick={() => setDetailOpen((o) => !o)}
          className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
            detailOpen ? 'bg-[#d3883f] text-white' : 'border border-[#d3883f] bg-white text-[#d3883f]'
          }`}
        >
          ルート詳細
        </button>

        <button
          type="button"
          onClick={() => setSaved((s) => !s)}
          className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
            saved ? 'bg-[#d3883f] text-white' : 'border border-[#d3883f] bg-white text-[#d3883f]'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={saved ? '#fff' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {saved ? '保存済み' : '保存'}
        </button>
      </div>
    </div>
  )
}
