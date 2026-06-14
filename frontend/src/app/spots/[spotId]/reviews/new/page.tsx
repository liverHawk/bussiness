"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { postReview } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

export default function PostReviewPage(): React.JSX.Element {
  const params = useParams<{ spotId: string }>();
  const router = useRouter();
  const spotId = params?.spotId ?? "";

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("評価を選択してください"); return; }
    if (!content.trim()) { setError("レビュー本文を入力してください"); return; }
    setError(null);
    setLoading(true);
    try {
      await postReview(spotId, { rating, content });
      router.push(`/spots/${spotId}/reviews`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
    <div className="min-h-screen bg-[#f2f0ed]">
      <header className="sticky top-0 z-40 bg-[#ece8e1]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-2xl text-gray-700"
            aria-label="戻る"
          >
            ←
          </button>
          <h1 className="text-base font-semibold text-gray-900">レビューを投稿</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">評価</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-3xl transition-transform hover:scale-110"
                  aria-label={`${star}点`}
                >
                  <span className={(hovered || rating) >= star ? "text-amber-400" : "text-gray-300"}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-1 text-sm text-amber-600 font-semibold">{rating}.0 / 5.0</p>
            )}
          </div>

          {/* Review text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">レビュー</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="このスポットの感想を書いてください..."
              rows={5}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d3883f] resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{content.length} 文字</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#d3883f] text-white rounded-full py-3 text-sm font-semibold shadow-md transition hover:bg-[#c2792f] disabled:opacity-60"
          >
            {loading ? "投稿中..." : "投稿する"}
          </button>
        </form>
      </main>
    </div>
    </AuthGuard>
  );
}
