"use client"

type Props = {
  onClick?: () => void
}

export default function PrimaryRouteButton({ onClick }: Props) {
  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }
    // 将来: ルート検索の詳細入力画面 (RouteSearchScreen) へ遷移
    console.log('go to route search')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center gap-3 rounded-full bg-[#d3883f] px-6 py-4 text-white shadow-md transition hover:bg-[#c2792f] active:scale-[0.98]"
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
        className="flex-none"
      >
        <path d="M4 20 9 4" />
        <path d="M20 20 15 4" />
        <path d="M12 4v16" strokeDasharray="2 3" />
      </svg>
      <span className="text-base font-semibold">ルート検索</span>
    </button>
  )
}
