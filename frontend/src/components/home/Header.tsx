// React import not required with new JSX transform

export default function Header() {
  return (
    <header className="flex items-center justify-between py-2">
      <button
        type="button"
        aria-label="メニューを開く"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-[#2f2419] transition active:scale-95 active:bg-black/5"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <button
        type="button"
        aria-label="プロフィール"
        className="flex h-10 w-10 items-center justify-center rounded-full text-[#2f2419] transition active:scale-95 active:bg-black/5"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3.2" />
          <path d="M5.5 19.2a7.2 7.2 0 0 1 13 0" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  )
}
