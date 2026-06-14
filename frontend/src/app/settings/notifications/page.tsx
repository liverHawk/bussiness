"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "notificationsEnabled";

export default function NotificationsSettingsPage(): React.JSX.Element {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setEnabled(saved === "true");
  }, []);

  const toggle = () => {
    setEnabled((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

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
          <h1 className="text-lg font-bold text-[#2f2419]">通知設定</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#2f2419]">通知を受け取る</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={toggle}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                enabled ? "bg-[#d3883f]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  enabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {enabled ? "通知はオンです" : "通知はオフです"}
          </p>
        </div>
      </main>
    </div>
  );
}
