"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/api'

type Props = {
  children: React.ReactNode
}

/**
 * 未ログインユーザーを /login へリダイレクトする認証ガード。
 * "use client" ページのトップに置いて使う。
 */
export default function AuthGuard({ children }: Props) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffbf7]">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return <>{children}</>
}
