"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GENRES } from "@/lib/genres";
import { searchSpots, type Spot, type SpotSearchFilters } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import MenuDrawer from "@/components/home/MenuDrawer";

type FilterState = SpotSearchFilters;

const CONGESTION_OPTIONS = [
  { value: "crowded", label: "混雑" },
  { value: "few_crowded", label: "少し混雑" },
  { value: "few_empty", label: "少し空き" },
  { value: "empty", label: "空き" },
];

const REVIEW_OPTIONS = [
  { value: "4.1-5.0", label: "☆4.1〜☆5.0" },
  { value: "3.1-4.0", label: "☆3.1〜☆4.0" },
  { value: "2.1-3.0", label: "☆2.1〜☆3.0" },
  { value: "2.0-below", label: "☆2.0以下" },
];

function allChecked(selected: string[], options: string[]): boolean {
  return options.every((v) => selected.includes(v));
}

function toggleAll(selected: string[], options: string[]): string[] {
  if (allChecked(selected, options)) return [];
  return options;
}

export default function FilterPage(): React.JSX.Element {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    congestion: [],
    genres: [],
    reviews: [],
  });
  const [results, setResults] = useState<Spot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  const handleFilter = async (): Promise<void> => {
    setLoading(true);
    setSearchError(null);
    try {
      const spots = await searchSpots(filters);
      setResults(spots);
    } catch {
      setSearchError("検索に失敗しました。再試行してください");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const congestionValues = CONGESTION_OPTIONS.map((o) => o.value);
  const genreValues = GENRES.map((g) => g.id);
  const reviewValues = REVIEW_OPTIONS.map((o) => o.value);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-40 bg-white">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="text-2xl text-gray-700"
              aria-label="メニュー"
            >
              ☰
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-4">
          <div className="space-y-5">

            {/* 混雑 */}
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 pt-2 min-w-[72px]">
                <span className="text-sm font-medium text-gray-800">混雑</span>
                <input
                  type="checkbox"
                  checked={allChecked(filters.congestion, congestionValues)}
                  onChange={() =>
                    setFilters((prev) => ({
                      ...prev,
                      congestion: toggleAll(prev.congestion, congestionValues),
                    }))
                  }
                  className="w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 space-y-2">
                {CONGESTION_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.congestion.includes(option.value)}
                      onChange={() => handleCongestionChange(option.value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ジャンル */}
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 pt-2 min-w-[72px]">
                <span className="text-sm font-medium text-gray-800">ジャンル</span>
                <input
                  type="checkbox"
                  checked={allChecked(filters.genres, genreValues)}
                  onChange={() =>
                    setFilters((prev) => ({
                      ...prev,
                      genres: toggleAll(prev.genres, genreValues),
                    }))
                  }
                  className="w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 space-y-2">
                {GENRES.map((genre) => (
                  <label key={genre.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.genres.includes(genre.id)}
                      onChange={() => handleGenreChange(genre.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{genre.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* レビュー */}
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 pt-2 min-w-[72px]">
                <span className="text-sm font-medium text-gray-800">レビュー</span>
                <input
                  type="checkbox"
                  checked={allChecked(filters.reviews, reviewValues)}
                  onChange={() =>
                    setFilters((prev) => ({
                      ...prev,
                      reviews: toggleAll(prev.reviews, reviewValues),
                    }))
                  }
                  className="w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 space-y-2">
                {REVIEW_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.reviews.includes(option.value)}
                      onChange={() => handleReviewChange(option.value)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          <div className="mt-8">
            <button
              onClick={handleFilter}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-full transition-colors duration-200"
            >
              {loading ? "検索中..." : "この条件で絞り込む >"}
            </button>
          </div>

          {searchError && (
            <p className="mt-4 text-sm text-red-500 text-center">{searchError}</p>
          )}

          {results !== null && (
            <section className="mt-6 pb-8">
              {results.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  条件に一致するスポットがありません
                </p>
              ) : (
                <ul className="space-y-3">
                  {results.map((spot) => (
                    <li key={spot.spotId}>
                      <button
                        type="button"
                        onClick={() => router.push(`/spots/${spot.spotId}/reviews`)}
                        className="w-full text-left bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm hover:border-orange-200 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{spot.name}</span>
                          <span className="text-sm text-amber-500">
                            ☆ {spot.reviewRating.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>{spot.category}</span>
                          <span>·</span>
                          <span>{spot.congestionStatus}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>

        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    </AuthGuard>
  );
}
