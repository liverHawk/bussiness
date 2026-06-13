"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSpotReviews, getSpotDetail, type SpotReview, type SpotDetail } from "@/lib/api";

const PHOTO_SEEDS = [
  "cafe-a", "cafe-b", "cafe-c", "cafe-d", "cafe-e", "cafe-f",
  "cafe-g", "cafe-h", "cafe-i", "cafe-j", "cafe-k", "cafe-l",
];

const thumbUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/240/240`;
const largeUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/900/900`;

const MOCK_REVIEWS: SpotReview[] = [
  { reviewId: "r1", userName: "山田祐樹", rating: 4.0, content: "店員さんの対応が丁寧で、コーヒーも香り高くて最高でした。また行きたい。", photoUrl: null },
  { reviewId: "r2", userName: "さとう", rating: 5.0, content: "落ち着いた雰囲気で長居しやすいです。Wi-Fiも電源もあって作業がはかどりました。", photoUrl: null },
  { reviewId: "r3", userName: "拓", rating: 3.5, content: "アイスコーヒーがすっきりして美味しい。お昼時は少し混んでいました。", photoUrl: null },
  { reviewId: "r4", userName: "さとみ", rating: 4.5, content: "ケーキとのセットがお得。スタッフさんの笑顔が素敵で気持ちよく過ごせました。", photoUrl: null },
  { reviewId: "r5", userName: "小坂マント", rating: 4.0, content: "駅近で便利。席の間隔がゆったりしていて居心地が良かったです。", photoUrl: null },
];

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

  useEffect(() => {
    getSpotDetail(spotId)
      .then(setSpot)
      .catch(() => {
        setSpot({
          spotId,
          name: "△△コーヒーショップ",
          description: "",
          category: "カフェ",
          latitude: 0,
          longitude: 0,
          congestionStatus: "empty",
          reviewRating: 4.0,
        });
      });

    getSpotReviews(spotId)
      .then(setReviews)
      .catch(() => setReviews(MOCK_REVIEWS));
  }, [spotId]);

  const photoSeeds = reviews.length > 0
    ? reviews.filter((r) => r.photoUrl).map((r) => {
        const m = r.photoUrl?.match(/seed\/([^/]+)/);
        return m ? m[1] : null;
      }).filter(Boolean) as string[]
    : PHOTO_SEEDS;

  const imageUrl = photoSeeds.length > 0
    ? thumbUrl(photoSeeds[0])
    : thumbUrl("cafe-a");

  return (
    <div className="min-h-screen bg-[#f2f0ed]">
      <header className="sticky top-0 z-40 bg-[#ece8e1]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <button className="text-2xl text-gray-700" aria-label="Menu">☰</button>
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
              onClick={() => router.push(`/map?spotId=${spotId}`)}
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
          {photoSeeds.map((seed) => (
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
    </div>
  );
}
