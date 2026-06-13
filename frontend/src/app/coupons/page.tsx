"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { fetchMyCoupons, CouponItem } from "@/lib/api";

const DEV_TOKEN = "dev-token-placeholder";

export default function MyCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyCoupons(DEV_TOKEN)
      .then((items) => {
        setCoupons(items);
        setError(null);
      })
      .catch(() => {
        setCoupons([]);
        setError("クーポンの取得に失敗しました");
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#fdf8f3] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <span className="text-xl">☰</span>
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <span className="text-xl">👤</span>
          </button>
        </header>

        <section className="mb-8 rounded-full bg-[#c8954a] px-6 py-5 text-white shadow-md shadow-black/10">
          <p className="text-sm opacity-90">アカウント名</p>
          <p className="mt-1 text-lg font-semibold">〇〇〇</p>
        </section>

        <h1 className="mb-6 text-3xl font-bold text-[#3c2b19]">マイクーポン</h1>

        {isLoading ? (
          <p className="text-base text-gray-600">読み込み中...</p>
        ) : error ? (
          <p className="text-base text-red-600">{error}</p>
        ) : coupons?.length === 0 ? (
          <p className="text-base text-gray-600">保有しているクーポンはありません</p>
        ) : (
          <div className="space-y-4">
            {coupons?.map((coupon) => (
              <div
                key={coupon.couponId}
                className={`relative overflow-hidden rounded-3xl bg-white p-4 shadow-lg shadow-black/5 ${
                  coupon.isUsed ? "opacity-50" : ""
                }`}
              >
                {coupon.isUsed ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-md">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-10 w-10 text-[#8a6b3b]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-4">
                  <div className="relative h-15 w-15 min-h-[60px] min-w-[60px] overflow-hidden rounded-2xl bg-gray-100">
                    <Image
                      src={coupon.qrCodeUrl}
                      alt={coupon.title}
                      width={60}
                      height={60}
                      className="h-15 w-15 object-cover"
                    />
                  </div>

                  <div className="hidden h-24 w-px border-r border-dashed border-slate-300 md:block" />

                  <div className="flex-1">
                    <p className="text-base font-semibold leading-6 text-slate-900">
                      {coupon.title}
                    </p>
                    {!coupon.isUsed ? (
                      <p className="mt-3 text-sm text-slate-500">
                        有効期限: {coupon.expiryDate}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
