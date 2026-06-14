"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from './Header'
import PrimaryRouteButton from './PrimaryRouteButton'
import SearchBar from './SearchBar'
import MapSection from './MapSection'
import { SEARCH_SPOTS, type Spot } from '@/lib/spots'
import { searchSpots } from '@/lib/api'
import type { CongestionLevel } from '@/lib/congestion'
import type { SpotCategory } from '@/lib/spots'

/** API の混雑ラベル → CongestionLevel (1-4) */
function toCongestionLevel(status: string): CongestionLevel {
  if (status === '混雑') return 4
  if (status === '少し混雑') return 3
  if (status === 'やや混雑') return 3
  if (status === '少し空き') return 2
  return 1
}

/** API のカテゴリ文字列 → SpotCategory */
function toSpotCategory(category: string): SpotCategory {
  if (category.includes('レストラン') || category.includes('カフェ') || category.includes('料理')) return 'restaurant'
  if (category.includes('寺院') || category.includes('神社') || category.includes('公園') || category.includes('城')) return 'tourist'
  return 'facility'
}

export default function HomeScreen() {
  const router = useRouter()
  const [spots, setSpots] = useState<Spot[]>(SEARCH_SPOTS)

  // 起動時にAPIからスポットを取得（認証エラーはモックにフォールバック）
  useEffect(() => {
    searchSpots({ congestion: [], genres: [], reviews: [] })
      .then((apiSpots) => {
        const converted: Spot[] = apiSpots.map((s) => ({
          id: s.spotId,
          name: s.name,
          category: toSpotCategory(s.category),
          lat: s.latitude,
          lng: s.longitude,
          congestion: toCongestionLevel(s.congestionStatus),
        }))
        if (converted.length > 0) setSpots(converted)
      })
      .catch(() => {
        // 認証未済またはAPI未接続時はモックデータを維持
      })
  }, [])

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#fffbf7] text-[#2f2419]">
      <div className="z-10 flex flex-col gap-3 px-4 pb-4 pt-3">
        <Header />
        <PrimaryRouteButton onClick={() => router.push('/route-search')} />
        <SearchBar
          onSearchClick={() => router.push('/search/filter')}
          onFilterClick={() => router.push('/search/filter')}
        />
      </div>

      <div className="relative -mt-3 flex-1 overflow-hidden rounded-t-3xl shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {/* ピンは常に表示 */}
        <MapSection showCongestion spots={spots} />
      </div>
    </div>
  )
}
