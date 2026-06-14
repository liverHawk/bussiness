"use client"

import { useState } from 'react'
import MenuDrawer from './MenuDrawer'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="flex items-center py-2">
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={() => setMenuOpen(true)}
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
      </header>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
