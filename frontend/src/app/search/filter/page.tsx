"use client";

import { useState } from "react";
import { GENRES } from "@/lib/genres";

interface FilterState {
  congestion: string[];
  genres: string[];
  reviews: string[];
}

interface MockSpot {
  spotId: string;
  name: string;
  category: string;
  congestionStatus: string;
  reviewRating: number;
}

const CONGESTION_OPTIONS = [
  { value: "crowded", label: "混雑" },
  { value: "few_crowded", label: "少し混雑" },
  { value: "few_empty", label: "少し空き" },
  { value: "empty", label: "空き" },
];

const REVIEW_OPTIONS = [
  { value: "4.1-5.0", label: "☆4.1〜☆5.0", minReview: 4.1 },
  { value: "3.1-4.0", label: "☆3.1〜☆4.0", minReview: 3.1 },
  { value: "2.1-3.0", label: "☆2.1〜☆3.0", minReview: 2.1 },
  { value: "2.0-below", label: "☆2.0以下", minReview: 0 },
];

const MOCK_SPOTS: MockSpot[] = [
  {
    spotId: "spt_001",
    name: "リバーサイドカフェ中之島",
    category: "カフェ",
    congestionStatus: "空いている",
    reviewRating: 4.5,
  },
  {
    spotId: "spt_002",
    name: "難波テラスコーヒー",
    category: "カフェ",
    congestionStatus: "少し空き",
    reviewRating: 3.8,
  },
];

export default function FilterPage(): JSX.Element {
  const [filters, setFilters] = useState<FilterState>({
    congestion: [],
    genres: [],
    reviews: [],
  });

  const handleCongestionChange = (value: string): void => {
    setFilters((prev) => ({
      ...prev,
      congestion: prev.congestion.includes(value)
        ? prev.congestion.filter((item) => item !== value)
        : [...prev.congestion, value],
    }));
  };

  const handleGenreChange = (value: string): void => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(value)
        ? prev.genres.filter((item) => item !== value)
        : [...prev.genres, value],
    }));
  };

  const handleReviewChange = (value: string): void => {
    setFilters((prev) => ({
      ...prev,
      reviews: prev.reviews.includes(value)
        ? prev.reviews.filter((item) => item !== value)
        : [...prev.reviews, value],
    }));
  };

  const handleFilter = (): void => {
    const filterResult = {
      selectedFilters: filters,
      mockResults: MOCK_SPOTS,
      timestamp: new Date().toISOString(),
    };
    console.log("Filter conditions:", filterResult);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            className="text-2xl text-gray-700 hover:text-gray-900"
            aria-label="Menu"
          >
            ☰
          </button>
          <h1 className="text-lg font-semibold text-gray-900">検索</h1>
          <button
            className="text-2xl text-gray-700 hover:text-gray-900"
            aria-label="Account"
          >
            👤
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="flex items-center gap-2 mb-8 bg-gray-100 rounded-full px-4 py-2.5">
          <span className="text-lg text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="検索"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
            readOnly
          />
          <button className="text-lg text-gray-500 hover:text-gray-700">
            ⚙
          </button>
        </div>

        {/* Filter Sections */}
        <div className="space-y-6">
          {/* Congestion Section */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">混雑</h2>
            <div className="space-y-3">
              {CONGESTION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.congestion.includes(option.value)}
                    onChange={() => handleCongestionChange(option.value)}
                    className="w-5 h-5 text-orange-400 rounded border-gray-300 cursor-pointer accent-orange-500"
                  />
                  <span className="ml-3 text-gray-700 group-hover:text-gray-900">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Genre Section */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">ジャンル</h2>
            <div className="space-y-3">
              {GENRES.map((genre) => (
                <label
                  key={genre.id}
                  className="flex items-center cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.genres.includes(genre.id)}
                    onChange={() => handleGenreChange(genre.id)}
                    className="w-5 h-5 text-orange-400 rounded border-gray-300 cursor-pointer accent-orange-500"
                  />
                  <span className="ml-3 text-lg">{genre.icon}</span>
                  <span className="ml-2 text-gray-700 group-hover:text-gray-900">
                    {genre.name}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Review Section */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">レビュー</h2>
            <div className="space-y-3">
              {REVIEW_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.reviews.includes(option.value)}
                    onChange={() => handleReviewChange(option.value)}
                    className="w-5 h-5 text-orange-400 rounded border-gray-300 cursor-pointer accent-orange-500"
                  />
                  <span className="ml-3 text-gray-700 group-hover:text-gray-900">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Filter Button */}
          <div className="pt-2 pb-8">
            <button
              onClick={handleFilter}
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 px-6 rounded-full transition-colors duration-200"
            >
              この条件で絞り込む &gt;
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
