export interface Genre {
  id: string;
  name: string;
  icon: string; // emoji icon for simplicity
}

export const GENRES: Genre[] = [
  { id: "cafe", name: "カフェ", icon: "☕" },
  { id: "restaurant", name: "レストラン", icon: "🍴" },
  { id: "ramen", name: "ラーメン", icon: "🍜" },
  { id: "sushi", name: "寿司", icon: "🍣" },
  { id: "izakaya", name: "居酒屋", icon: "🍶" },
  { id: "bakery", name: "ベーカリー", icon: "🥐" },
  { id: "dessert", name: "デザート", icon: "🍰" },
  { id: "bar", name: "バー", icon: "🍸" },
];
