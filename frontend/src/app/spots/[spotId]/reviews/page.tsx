"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ---- 自前設計の型（API は無いのでフロントでモック） ----
interface SpotSummary {
  spotId: string;
  name: string;
  imageUrl: string;
  reviewRating: number;
  totalReviews: number;
  totalPhotos: number;
}

interface Review {
  reviewId: string;
  userName: string;
  rating: number;
  content: string;
}

// 写真（picsum のシードからサムネイル/拡大URLを生成）
const PHOTO_SEEDS = [
  "cafe-a",
  "cafe-b",
  "cafe-c",
  "cafe-d",
  "cafe-e",
  "cafe-f",
  "cafe-g",
  "cafe-h",
  "cafe-i",
  "cafe-j",
  "cafe-k",
  "cafe-l",
];

const thumbUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/240/240`;
const largeUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/900/900`;

const MOCK_REVIEWS: Review[] = [
  {
    reviewId: "r1",
    userName: "山田祐樹",
    rating: 4.0,
    content: "店員さんの対応が丁寧で、コーヒーも香り高くて最高でした。また行きたい。",
  },
  {
    reviewId: "r2",
    userName: "さとう",
    rating: 5.0,
    content: "落ち着いた雰囲気で長居しやすいです。Wi-Fiも電源もあって作業がはかどりました。",
  },
  {
    reviewId: "r3",
    userName: "拓",
    rating: 3.5,
    content: "アイスコーヒーがすっきりして美味しい。お昼時は少し混んでいました。",
  },
  {
    reviewId: "r4",
    userName: "さとみ",
    rating: 4.5,
    content: "ケーキとのセットがお得。スタッフさんの笑顔が素敵で気持ちよく過ごせました。",
  },
  {
    reviewId: "r5",
    userName: "小坂マント",
    rating: 4.0,
    content: "駅近で便利。席の間隔がゆったりしていて居心地が良かったです。",
  },
  {
    reviewId: "r6",
    userName: "ぱんだ",
    rating: 3.0,
    content: "味は良かったけれど、ピーク時は少し待ちました。テイクアウト向きかも。",
  },
  {
    reviewId: "r7",
    userName: "miki",
    rating: 5.0,
    content: "ラテアートが可愛くて感動！豆の種類も選べて本格的でした。",
  },
  {
    reviewId: "r8",
    userName: "けんた",
    rating: 4.0,
    content: "モーニングのトーストがサクサクで美味しい。朝から元気をもらえます。",
  },
  {
    reviewId: "r9",
    userName: "あおい",
    rating: 4.5,
    content: "店内が清潔で居心地抜群。読書するのにぴったりの静かさでした。",
  },
  {
    reviewId: "r10",
    userName: "Tom",
    rating: 3.5,
    content: "コーヒーは美味しいけど少し価格高め。雰囲気代と思えば納得です。",
  },
];

function StarRating({ rating }: { rating: number }): React.JSX.Element {
  const filled = Math.round(rating);
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < filled ? "★" : "☆"
  ).join("");
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-amber-400 text-sm">{stars}</span>
      <span className="text-sm font-semibold text-gray-700">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

export default function SpotReviewsPage(): React.JSX.Element {
  const params = useParams<{ spotId: string }>();
  const router = useRouter();
  const spotId = params?.spotId ?? "unknown";

  const spot: SpotSummary = {
    spotId,
    name: "△△コーヒーショップ☆☆駅店",
    imageUrl: thumbUrl("cafe-a"),
    reviewRating: 4.0,
    totalReviews: MOCK_REVIEWS.length,
    totalPhotos: PHOTO_SEEDS.length,
  };

  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#f2f0ed]">
      {/* Header（メニューは今後の共通ヘッダーコンポーネントで実装するため未配線） */}
      <header className="sticky top-0 z-40 bg-[#ece8e1]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <button className="text-2xl text-gray-700" aria-label="Menu">
            ☰
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {/* Spot summary card */}
        <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spot.imageUrl}
            alt={spot.name}
            className="w-28 object-cover shrink-0"
          />
          <div className="flex-1 p-3 flex flex-col items-center justify-center text-center">
            <button
              type="button"
              onClick={() => router.push(`/map?spotId=${spot.spotId}`)}
              className="text-sm font-semibold text-gray-900 underline leading-snug hover:text-orange-600 cursor-pointer"
            >
              {spot.name}
            </button>
            <div className="mt-1">
              <StarRating rating={spot.reviewRating} />
            </div>
          </div>
        </div>

        {/* Photo strip (横スクロール・タップで拡大) */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {PHOTO_SEEDS.map((seed) => (
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

        {/* Reviews list (縦スクロール) */}
        <ul className="mt-4 space-y-1">
          {MOCK_REVIEWS.map((review) => (
            <li key={review.reviewId} className="py-3 border-b border-gray-200">
              <p className="text-sm font-bold text-amber-700">
                {review.userName}
              </p>
              <div className="mt-1">
                <StarRating rating={review.rating} />
              </div>
              <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                {review.content}
              </p>
            </li>
          ))}
        </ul>
      </main>

      {/* Lightbox（タップした写真を拡大、クリックで閉じる） */}
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
