"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { fetchMyCoupons, getAccessToken, CouponItem } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

export default function MyCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken() ?? "";
    fetchMyCoupons(token)
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
    <AuthGuard>
    <main className="min-h-screen bg-[#f9f2e8] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm shadow-slate-200"
          >
            <span className="text-xl">☰</span>
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm shadow-slate-200"
          >
            <span className="text-xl">👤</span>
          </button>
        </header>

        <section className="mb-8 overflow-hidden rounded-full bg-[#c68f3a] px-6 py-5 text-white shadow-lg shadow-black/10">
          <p className="text-sm opacity-90">アカウント名</p>
          <p className="mt-1 text-lg font-semibold tracking-wide">〇〇〇</p>
        </section>

        <h1 className="mb-6 text-3xl font-bold tracking-tight text-[#3c2b19]">マイクーポン</h1>

        {isLoading ? (
          <p className="text-base text-slate-600">読み込み中...</p>
        ) : error ? (
          <p className="text-base text-red-600">{error}</p>
        ) : !coupons || coupons.length === 0 ? (
          <p className="text-base text-slate-600">保有しているクーポンはありません</p>
        ) : (
          <div className="space-y-4 pb-6">
            {coupons.map((coupon) => (
              <div
                key={coupon.couponId}
                className={`relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(60,44,29,0.4)] ${
                  coupon.isUsed ? "opacity-70" : ""
                }`}
              >
                <div className="absolute left-0 top-1/2 h-[56px] w-[56px] -translate-y-1/2 rounded-full bg-[#f9f2e8] shadow-inner shadow-slate-200" />
                <div className="absolute right-0 top-1/2 h-[56px] w-[56px] -translate-y-1/2 rounded-full bg-[#f9f2e8] shadow-inner shadow-slate-200" />

                <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
                  <div className="flex min-h-[120px] min-w-[120px] items-center justify-center rounded-3xl bg-slate-100 p-4 shadow-inner sm:min-w-[140px]">
                    <Image
                      src={coupon.qrCodeUrl}
                      alt={coupon.title}
                      width={120}
                      height={120}
                      className="h-28 w-28 rounded-3xl object-cover"
                    />
                  </div>

                  <div className="relative flex-1 sm:pl-4">
                    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px border-r border-dashed border-slate-300 sm:block" />
                    <div className="sm:ml-6">
                      <p className="text-lg font-semibold leading-7 text-slate-900">{coupon.title}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-500">有効期限: {coupon.expiryDate}</p>
                    </div>
                  </div>
                </div>

                {coupon.isUsed ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#3c2b19]/10 text-[#3c2b19] shadow-lg">
                      <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
    </AuthGuard>
  );
}
