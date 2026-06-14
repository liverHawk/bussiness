"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clearAccessToken } from '@/lib/api'

type Props = {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { href: '/',              label: 'ホーム',         emoji: '🏠' },
  { href: '/route-search',  label: 'AIルート検索',   emoji: '🤖' },
  { href: '/buymegucoins',  label: 'コイン購入',     emoji: '🪙' },
  { href: '/coupons',       label: 'マイクーポン',   emoji: '🎟️' },
  { href: '/search/filter', label: 'スポット検索',   emoji: '🔍' },
  { href: '/settings',      label: '設定',           emoji: '⚙️' },
]

export default function MenuDrawer({ open, onClose }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleLogout = () => {
    clearAccessToken()
    onClose()
    router.push('/login')
  }

  if (!mounted) return null

  return createPortal(
    <>
      {/* Overlay */}
      {open && (
        <button
          type="button"
          aria-label="メニューを閉じる"
          onClick={onClose}
          className="fixed inset-0 bg-black/40"
          style={{ zIndex: 9998 }}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-[#f3e4d7] shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ zIndex: 9999 }}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#d4b896]">
          <span className="text-lg font-bold text-[#2f2419]">メニュー</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-2xl text-[#2f2419] hover:opacity-70"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-4 px-6 py-4 text-[#2f2419] hover:bg-[#e8d5c0] transition-colors"
            >
              <span className="text-2xl w-8 text-center">{item.emoji}</span>
              <span className="text-base font-medium">{item.label}</span>
            </Link>
          ))}

          <hr className="my-2 border-[#d4b896] mx-6" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-4 px-6 py-4 text-red-700 hover:bg-red-50 transition-colors w-full text-left"
          >
            <span className="text-2xl w-8 text-center">🚪</span>
            <span className="text-base font-medium">ログアウト</span>
          </button>
        </nav>
      </aside>
    </>,
    document.body
  )
}
