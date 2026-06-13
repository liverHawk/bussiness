"use client"

type Props = {
  onSearchClick?: () => void
  onFilterClick?: () => void
}

export default function SearchBar({ onSearchClick, onFilterClick }: Props) {
  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick()
      return
    }
    // 将来: 地点検索 UI への遷移
    console.log('open search')
  }

  const handleFilterClick = () => {
    if (onFilterClick) {
      onFilterClick()
      return
    }
    // 将来: 検索条件(フィルター)画面への遷移
    console.log('open filter')
  }

  return (
    <div className="flex w-full items-center gap-3 rounded-full bg-white px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={handleSearchClick}
        className="flex flex-1 items-center gap-3 text-left transition active:scale-[0.98]"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-none text-gray-400"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="text-sm text-gray-400">検索</span>
      </button>

      <button
        type="button"
        onClick={handleFilterClick}
        aria-label="フィルター"
        className="flex-none text-[#2f2419] transition active:scale-95"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <circle cx="14" cy="6" r="2" fill="white" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <circle cx="8" cy="12" r="2" fill="white" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="16" cy="18" r="2" fill="white" />
        </svg>
      </button>
    </div>
  )
}
