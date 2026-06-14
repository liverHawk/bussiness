"use client";

import React, { useState, useEffect } from "react";
import { purchaseCoins, getMe } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

interface CoinPlan {
  coinAmount: number;
  yen: number;
}

const COIN_PLANS: CoinPlan[] = [
  { coinAmount: 1000, yen: 1000 },
  { coinAmount: 2500, yen: 2500 },
  { coinAmount: 5000, yen: 5000 },
  { coinAmount: 10000, yen: 10000 },
];

export default function BuyMeguCoinsPage(): React.JSX.Element {
  const [processing, setProcessing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("—");
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    getMe()
      .then((me) => {
        setUserName(me.username);
        setCoins(me.currentTotalCoins);
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem("currentUser");
          if (raw) {
            const u = JSON.parse(raw) as { name?: string };
            setUserName(u.name ?? "—");
          }
        } catch {
          /* ignore */
        }
      });
  }, []);

  const handlePurchase = async (plan: CoinPlan): Promise<void> => {
    setProcessing(plan.coinAmount);
    setError(null);
    try {
      const res = await purchaseCoins(plan.coinAmount);
      window.location.href = res.stripeCheckoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "購入手続きに失敗しました");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#faf6ef]">
        <header className="sticky top-0 z-40 bg-[#f1ece3]">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <button className="text-2xl text-gray-700" aria-label="Menu">☰</button>
            <button className="text-2xl text-gray-700" aria-label="Account">👤</button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-6 py-4">
          <div className="flex justify-center mt-2">
            <span className="bg-orange-400 text-white text-sm font-semibold px-6 py-1.5 rounded-full shadow-sm">
              {userName}
            </span>
          </div>

          <p className="text-center text-lg text-gray-800 mt-4">
            現在の所持コイン：{coins.toLocaleString()}コイン
          </p>

          <h1 className="text-center text-xl font-bold text-gray-900 mt-10 mb-8">コイン購入</h1>

          {error && (
            <p className="text-sm text-red-500 text-center mb-4 bg-red-50 rounded-xl py-3 px-4">
              {error}
            </p>
          )}

          <ul className="space-y-6">
            {COIN_PLANS.map((plan) => (
              <li key={plan.coinAmount} className="flex items-center justify-between px-2">
                <span className="text-lg font-bold text-gray-900">
                  {plan.coinAmount.toLocaleString()}コイン
                </span>
                <button
                  onClick={() => handlePurchase(plan)}
                  disabled={processing !== null}
                  className="bg-orange-400 hover:bg-orange-500 active:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-1.5 rounded-full shadow-sm transition-colors min-w-[88px]"
                >
                  {processing === plan.coinAmount ? "処理中..." : `¥${plan.yen.toLocaleString()}`}
                </button>
              </li>
            ))}
          </ul>

          <p className="text-xs text-gray-400 text-center mt-10">
            Stripe Checkout で安全に決済されます。完了後、コインが自動付与されます。
          </p>
        </main>
      </div>
    </AuthGuard>
  );
}
