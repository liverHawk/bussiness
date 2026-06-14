"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

const SETTINGS_ITEMS = [
  { href: "/settings/account",      label: "アカウント設定",     emoji: "👤" },
  { href: "/settings/notifications",label: "通知設定",           emoji: "🔔" },
  { href: "/settings/language",     label: "言語設定",           emoji: "🌐" },
];

export default function SettingsPage(): React.JSX.Element {
  const router = useRouter();

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
          <h1 className="text-lg font-bold text-[#2f2419]">設定</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <ul className="space-y-2">
          {SETTINGS_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center justify-between bg-white rounded-2xl px-5 py-4 shadow-sm hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-base font-medium text-[#2f2419]">{item.label}</span>
                </div>
                <span className="text-gray-400 text-lg">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
