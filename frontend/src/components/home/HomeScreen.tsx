"use client"

import { useRouter } from 'next/navigation'
import Header from './Header'
import PrimaryRouteButton from './PrimaryRouteButton'
import SearchBar from './SearchBar'
import MapSection from './MapSection'

/**
 * トップ画面（親画面）。
 * ヘッダー・ルート検索ボタン・検索バーを上部に固定的に配置し、
 * その下を地図が占める構成。
 */
export default function HomeScreen() {
  const router = useRouter()

  const handleRouteSearchClick = () => {
    router.push('/route-search')
  }

  const handleSearchClick = () => {
    // 将来: 地点検索 UI への遷移
    console.log('open search')
  }

  const handleFilterClick = () => {
    // 将来: 検索条件(フィルター)画面への遷移
    console.log('open filter')
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#fffbf7] text-[#2f2419]">
      <div className="z-10 flex flex-col gap-3 px-4 pb-4 pt-3">
        <Header />
        <PrimaryRouteButton onClick={handleRouteSearchClick} />
        <SearchBar onSearchClick={handleSearchClick} onFilterClick={handleFilterClick} />
      </div>

      <div className="relative -mt-3 flex-1 overflow-hidden rounded-t-3xl shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <MapSection />
      </div>
    </div>
  )
}
