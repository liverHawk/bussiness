export interface Genre {
  id: string;
  name: string;
  icon: string; // emoji icon for simplicity
}

export const GENRES: Genre[] = [
  { id: "cafe",    name: "カフェ",           icon: "☕" },
  { id: "restaurant", name: "レストラン",    icon: "🍴" },
  { id: "temple",  name: "寺院・神社・城",   icon: "⛩️" },
  { id: "park",    name: "公園",             icon: "🌳" },
  { id: "museum",  name: "美術館・博物館・ミュージアム", icon: "🏛️" },
];
