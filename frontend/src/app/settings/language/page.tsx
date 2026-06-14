"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "appLanguage";

const LANGUAGES = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
];

export default function LanguageSettingsPage(): React.JSX.Element {
  const router = useRouter();
  const [lang, setLang] = useState("ja");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setLang(saved);
  }, []);

  const handleChange = (value: string) => {
    setLang(value);
    localStorage.setItem(STORAGE_KEY, value);
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
          <h1 className="text-lg font-bold text-[#2f2419]">言語設定</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {LANGUAGES.map((l, i) => (
            <button
              key={l.value}
              type="button"
              onClick={() => handleChange(l.value)}
              className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                i > 0 ? "border-t border-gray-100" : ""
              } ${lang === l.value ? "bg-orange-50" : "hover:bg-gray-50"}`}
            >
              <span className="text-sm font-medium text-[#2f2419]">{l.label}</span>
              {lang === l.value && (
                <span className="text-[#d3883f] text-lg">✓</span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400 text-center">
          ※ 多言語対応は今後のアップデートで実装予定です
        </p>
      </main>
    </div>
  );
}
