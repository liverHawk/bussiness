"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { type CouponItem, fetchMyCoupons } from "@/lib/api";

// 開発用の仮トークン（認証機能が完成したら、ログイン後のトークンに差し替える）
const DEV_TOKEN = "dev-token-placeholder";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyCoupons(DEV_TOKEN)
      .then((data) => setCoupons(data))
      .catch(() => setError("クーポンの取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#fdf8f3]">
      <header className="flex items-center justify-between px-4 py-3">
        <button className="text-2xl text-gray-600" aria-label="メニュー">
          ☰
        </button>
        <button className="text-2xl text-gray-600" aria-label="アカウント">
          👤
        </button>
      </header>

      <div className="mx-4 mb-4">
        <div className="bg-[#c8954a] text-white text-center py-2 px-6 rounded-full font-semibold text-sm">
          アカウント名〇〇〇
        </div>
      </div>

      <h1 className="text-center text-xl font-bold text-gray-800 mb-4">
        マイクーポン
      </h1>

      <main className="px-4 space-y-4 pb-8">
        {loading && (
          <p className="text-center text-gray-400 mt-8">読み込み中...</p>
        )}
        {error && (
          <p className="text-center text-red-400 mt-8">{error}</p>
        )}
        {!loading && !error && coupons.length === 0 && (
          <p className="text-center text-gray-400 mt-8">
            保有しているクーポンはありません
          </p>
        )}
        {!loading &&
          !error &&
          coupons.map((coupon) => (
            <CouponCard key={coupon.couponId} coupon={coupon} />
          ))}
      </main>
    </div>
  );
}

function CouponCard({ coupon }: { coupon: CouponItem }) {
  return (
    <div
      className={`relative flex items-center bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${
        coupon.isUsed ? "opacity-50" : ""
      }`}
    >
      {coupon.isUsed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="border-4 border-gray-700 rounded-full p-3 opacity-80">
            <svg
              className="w-16 h-16 text-gray-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      )}

      <div className="p-3 flex-shrink-0">
        <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded">
          <Image
            src={coupon.qrCodeUrl}
            alt="QRコード"
            width={60}
            height={60}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            unoptimized
          />
        </div>
      </div>

      <div className="w-px self-stretch border-l-2 border-dashed border-gray-300 mx-1" />

      <div className="flex-1 px-3 py-4">
        <p className="text-sm font-semibold text-gray-800 whitespace-pre-line leading-snug">
          {coupon.title}
        </p>
        {coupon.expiryDate && !coupon.isUsed && (
          <p className="text-xs text-gray-400 mt-1">
            有効期限{coupon.expiryDate}
          </p>
        )}
      </div>
    </div>
  );
}