"use client";

import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-[#faf6ef] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-xl font-bold text-gray-800">決済がキャンセルされました</p>
        <p className="text-sm text-gray-500 mt-2">コインは追加されていません</p>
        <Link
          href="/buymegucoins"
          className="mt-6 inline-block w-full bg-[#d3883f] text-white rounded-full py-3 text-sm font-semibold"
        >
          コイン購入画面へ戻る
        </Link>
      </div>
    </div>
  );
}
