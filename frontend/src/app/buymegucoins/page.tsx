"use client";

import React, { useState, useEffect } from "react";
import { purchaseCoins, getMe, type CoinPurchaseResponse } from "@/lib/api";

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
  const [mockResult, setMockResult] = useState<CoinPurchaseResponse | null>(null);
  const [userName, setUserName] = useState("—");
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    getMe()
      .then((me) => { setUserName(me.username); setCoins(me.currentTotalCoins); })
      .catch(() => {
        try {
          const raw = localStorage.getItem("currentUser");
          if (raw) { const u = JSON.parse(raw); setUserName(u.name ?? "—"); }
        } catch { /* ignore */ }
      });
  }, []);

  const handlePurchase = async (plan: CoinPlan): Promise<void> => {
    setProcessing(plan.coinAmount);
    setMockResult(null);
    try {
      const res = await purchaseCoins(plan.coinAmount);
      // Stripe Checkout へリダイレクト
      window.location.href = res.stripeCheckoutUrl;
    } catch {
      // バックエンド未接続時のフォールバック（デモ用モック）
      setMockResult({
        paymentId: `pay_demo_${plan.coinAmount}`,
        coinAmount: plan.coinAmount,
        amountInYen: plan.yen,
        stripeCheckoutUrl: "https://checkout.stripe.com/c/pay/cs_test_demo",
      });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6ef]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f1ece3]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button className="text-2xl text-gray-700" aria-label="Menu">
            ☰
          </button>
          <button className="text-2xl text-gray-700" aria-label="Account">
            👤
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-4">
        {/* Account badge */}
        <div className="flex justify-center mt-2">
          <span className="bg-orange-400 text-white text-sm font-semibold px-6 py-1.5 rounded-full shadow-sm">
            {userName}
          </span>
        </div>

        {/* Current coins */}
        <p className="text-center text-lg text-gray-800 mt-4">
          現在の所持コイン：{coins.toLocaleString()}コイン
        </p>

        {/* Heading */}
        <h1 className="text-center text-xl font-bold text-gray-900 mt-10 mb-8">
          コイン購入
        </h1>

        {/* Plans */}
        <ul className="space-y-6">
          {COIN_PLANS.map((plan) => (
            <li
              key={plan.coinAmount}
              className="flex items-center justify-between px-2"
            >
              <span className="text-lg font-bold text-gray-900">
                {plan.coinAmount.toLocaleString()}コイン
              </span>
              <button
                onClick={() => handlePurchase(plan)}
                disabled={processing !== null}
                className="bg-orange-400 hover:bg-orange-500 active:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-1.5 rounded-full shadow-sm transition-colors min-w-[88px]"
              >
                {processing === plan.coinAmount
                  ? "処理中..."
                  : `¥${plan.yen.toLocaleString()}`}
              </button>
            </li>
          ))}
        </ul>

        {/* Mock result (backend 未接続時) */}
        {mockResult && (
          <div className="mt-10 bg-white/70 rounded-2xl p-4 border border-orange-100">
            <p className="text-xs text-amber-600 mb-3">
              ※ バックエンド未接続のためモック決済情報を表示しています
            </p>
            <dl className="text-sm text-gray-700 space-y-1">
              <div className="flex justify-between">
                <dt>決済ID</dt>
                <dd>{mockResult.paymentId}</dd>
              </div>
              <div className="flex justify-between">
                <dt>コイン</dt>
                <dd>{mockResult.coinAmount.toLocaleString()}コイン</dd>
              </div>
              <div className="flex justify-between">
                <dt>金額</dt>
                <dd>¥{mockResult.amountInYen.toLocaleString()}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-gray-500 break-all">
              決済URL: {mockResult.stripeCheckoutUrl}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
