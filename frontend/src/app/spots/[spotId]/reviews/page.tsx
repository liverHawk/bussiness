"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSpotReviews, getSpotDetail, type SpotReview, type SpotDetail } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import MenuDrawer from "@/components/home/MenuDrawer";

const PHOTO_SEEDS = [
  "cafe-a", "cafe-b", "cafe-c", "cafe-d", "cafe-e", "cafe-f",
  "cafe-g", "cafe-h", "cafe-i", "cafe-j", "cafe-k", "cafe-l",
];

const thumbUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/240/240`;
const largeUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/900/900`;

function StarRating({ rating }: { rating: number }): React.JSX.Element {
  const filled = Math.round(rating);
  const stars = Array.from({ length: 5 }, (_, i) => i < filled ? "★" : "☆").join("");
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-amber-400 text-sm">{stars}</span>
      <span className="text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function SpotReviewsPage(): React.JSX.Element {
  const params = useParams<{ spotId: string }>();
  const router = useRouter();
  const spotId = params?.spotId ?? "unknown";

  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [reviews, setReviews] = useState<SpotReview[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getSpotDetail(spotId)
      .then(setSpot)
      .catch(() => {
        setSpot({
          spotId,
          name: "スポット",
          description: "",
          category: "",
          latitude: 0,
          longitude: 0,
          congestionStatus: "empty",
          reviewRating: 0,
        });
      });

    getSpotReviews(spotId)
      .then(setReviews)
      .catch(() => setError(true));
  }, [spotId]);

  const photoSeeds = reviews.filter((r) => r.photoUrl).map((r) => {
    const m = r.photoUrl?.match(/seed\/([^/]+)/);
    return m ? m[1] : null;
  }).filter(Boolean) as string[];

  const displaySeeds = photoSeeds.length > 0 ? photoSeeds : PHOTO_SEEDS;
  const imageUrl = thumbUrl(displaySeeds[0]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f2f0ed]">
        <header className="sticky top-0 z-40 bg-[#ece8e1]">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center">
            <button
              type="button"
              className="text-2xl text-gray-700"
              aria-label="Menu"
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-4">
          <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={spot?.name ?? "スポット"}
              className="w-28 object-cover shrink-0"
            />
            <div className="flex-1 p-3 flex flex-col items-center justify-center text-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm font-semibold text-gray-900 underline leading-snug hover:text-orange-600 cursor-pointer"
              >
                {spot?.name ?? "読み込み中..."}
              </button>
              {spot && (
                <div className="mt-1">
                  <StarRating rating={spot.reviewRating} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {displaySeeds.map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => setSelectedSeed(seed)}
                className="shrink-0 cursor-pointer"
                aria-label="写真を拡大"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl(seed)}
                  alt="スポットの写真"
                  className="w-24 h-24 object-cover rounded-lg"
                />
              </button>
            ))}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.push(`/spots/${spotId}/reviews/new`)}
              className="w-full bg-[#d3883f] text-white rounded-full py-3 text-sm font-semibold shadow-md hover:bg-[#c2792f] transition"
            >
              ＋ レビューを書く
            </button>
          </div>

          {error ? (
            <p className="mt-6 text-center text-sm text-gray-500">レビューの取得に失敗しました。再試行してください。</p>
          ) : reviews.length === 0 && !error ? (
            <p className="mt-6 text-center text-sm text-gray-500">まだレビューがありません。</p>
          ) : (
            <ul className="mt-4 space-y-1">
              {reviews.map((review) => (
                <li key={review.reviewId} className="py-3 border-b border-gray-200">
                  <p className="text-sm font-bold text-amber-700">{review.userName}</p>
                  <div className="mt-1">
                    <StarRating rating={review.rating} />
                  </div>
                  <p className="mt-1 text-sm text-gray-700 leading-relaxed">{review.content}</p>
                </li>
              ))}
            </ul>
          )}
        </main>

        {selectedSeed && (
          <button
            type="button"
            onClick={() => setSelectedSeed(null)}
            aria-label="拡大画像を閉じる"
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={largeUrl(selectedSeed)}
              alt="拡大した写真"
              className="max-w-full max-h-full rounded-lg"
            />
          </button>
        )}

        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    </AuthGuard>
  );
}
