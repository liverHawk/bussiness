"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, type MeResponse } from "@/lib/api";

export default function AccountSettingsPage(): React.JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    getMe()
      .then((me) => {
        setUser(me);
        setName(me.username);
      })
      .catch(() => {
        // 未ログインの場合はローカルストレージから表示
        try {
          const raw = localStorage.getItem("currentUser");
          if (raw) {
            const u = JSON.parse(raw);
            setUser({ userId: u.id, username: u.name, currentTotalCoins: 0 });
            setName(u.name);
          }
        } catch {
          // ignore
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f3e4d7]">
      <header className="sticky top-0 z-40 bg-[#f3e4d7] border-b border-[#d4b896]">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[#2f2419] text-2xl leading-none"
            aria-label="戻る"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-[#2f2419]">アカウント設定</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-[#d3883f] flex items-center justify-center text-white text-4xl font-bold shadow-md">
            {name ? name[0] : "?"}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">読み込み中...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <label className="block text-xs text-gray-500 mb-1">ユーザー名</label>
              <input
                type="text"
                value={name}
                disabled={!editMode}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm text-gray-900 bg-transparent focus:outline-none disabled:opacity-60"
              />
            </div>

            <div className="px-5 py-4 border-b border-gray-100">
              <label className="block text-xs text-gray-500 mb-1">所持コイン</label>
              <p className="text-sm text-gray-900">
                {user?.currentTotalCoins?.toLocaleString() ?? 0} コイン
              </p>
            </div>

            <div className="px-5 py-4">
              <label className="block text-xs text-gray-500 mb-1">ユーザーID</label>
              <p className="text-xs text-gray-400 break-all">{user?.userId ?? "—"}</p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className="w-full rounded-full py-3 text-sm font-semibold shadow-sm bg-[#d3883f] text-white hover:bg-[#c2792f] transition"
          >
            {editMode ? "保存する（未実装）" : "プロフィールを編集"}
          </button>

          <button
            type="button"
            disabled
            className="w-full rounded-full py-3 text-sm font-semibold shadow-sm border border-gray-300 text-gray-500 disabled:opacity-50"
          >
            パスワードリセット（未実装）
          </button>
        </div>
      </main>
    </div>
  );
}
