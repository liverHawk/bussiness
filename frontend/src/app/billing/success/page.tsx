"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPaymentResult, syncPaymentResult } from "@/lib/api";

function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const paymentId = params.get("payment_id");
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"loading" | "done" | "pending" | "error">("loading");
  const [addedCoins, setAddedCoins] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!paymentId) {
      setStatus("error");
      setMessage("決済IDが見つかりません");
      return;
    }

    let attempts = 0;
    const poll = async () => {
      try {
        if (sessionId) {
          await syncPaymentResult(paymentId, sessionId);
        }
        const res = await getPaymentResult(paymentId);
        if (res.status === "COMPLETED") {
          setAddedCoins(res.addedCoins);
          setTotalCoins(res.currentTotalCoins);
          setStatus("done");
          return;
        }
        attempts += 1;
        if (attempts >= 10) {
          setStatus("pending");
          setMessage("決済処理中です。しばらくしてからコイン残高をご確認ください。");
          return;
        }
        setTimeout(poll, 2000);
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "決済結果の取得に失敗しました");
      }
    };
    void poll();
  }, [paymentId, sessionId]);

  return (
    <div className="min-h-screen bg-[#faf6ef] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
        {status === "loading" && (
          <>
            <p className="text-lg font-semibold text-gray-800">決済を確認しています…</p>
            <p className="text-sm text-gray-500 mt-2">少々お待ちください</p>
          </>
        )}
        {status === "done" && (
          <>
            <p className="text-2xl font-bold text-emerald-600 mb-2">購入完了</p>
            <p className="text-gray-700">
              +{addedCoins.toLocaleString()} コインが追加されました
            </p>
            <p className="text-sm text-gray-500 mt-2">
              現在の所持: {totalCoins.toLocaleString()} コイン
            </p>
            <button
              type="button"
              onClick={() => router.push("/buymegucoins")}
              className="mt-6 w-full bg-[#d3883f] text-white rounded-full py-3 text-sm font-semibold"
            >
              コイン購入画面へ
            </button>
          </>
        )}
        {status === "pending" && (
          <>
            <p className="text-lg font-semibold text-amber-600">処理中</p>
            <p className="text-sm text-gray-600 mt-2">{message}</p>
            <Link href="/buymegucoins" className="mt-6 inline-block text-[#d3883f] underline text-sm">
              コイン購入画面へ戻る
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-lg font-semibold text-red-500">エラー</p>
            <p className="text-sm text-gray-600 mt-2">{message}</p>
            <Link href="/buymegucoins" className="mt-6 inline-block text-[#d3883f] underline text-sm">
              コイン購入画面へ戻る
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf6ef]" />}>
      <SuccessContent />
    </Suspense>
  );
}
