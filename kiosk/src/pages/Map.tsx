import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAllStores } from "../lib/api";

// Leaflet のデフォルトアイコンパス修正（Vite バンドル対策）
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface StorePin {
  store_id: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  capacity?: number;
  crowrd_level?: number;
}

function crowdColor(level: number | undefined): string {
  if (level === undefined || level === null) return "#6366f1";
  if (level < 0.5) return "#10b981";
  if (level < 0.8) return "#f59e0b";
  return "#ef4444";
}

function crowdLabel(level: number | undefined): string {
  if (level === undefined || level === null) return "不明";
  if (level < 0.5) return "空いています";
  if (level < 0.8) return "やや混雑";
  return "混雑しています";
}

export default function Map() {
  const [stores, setStores] = useState<StorePin[]>([]);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => {
    getAllStores()
      .then((list) => {
        const pins = list.filter((s: any) => s.lat && s.lon) as StorePin[];
        setStores(pins);
      })
      .catch(() => setError("店舗データの取得に失敗しました"));
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 15000); // 15秒ごとに混雑度を更新
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // 中心は大阪公立大学 杉本キャンパス周辺（デフォルト）
  const center: [number, number] = stores.length > 0
    ? [stores[0].lat, stores[0].lon]
    : [34.5446, 135.5064];

  return (
    <div className="flex flex-col h-full -m-8">
      {/* ヘッダーバー */}
      <div className="flex items-center justify-between px-8 py-4 bg-white shadow-sm z-10">
        <h1 className="text-xl font-bold text-gray-700">店舗マップ</h1>
        <div className="flex items-center gap-5 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />空いています
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />やや混雑
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />混雑
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" />データなし
          </span>
          <button
            className="ml-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-xs"
            onClick={load}
          >
            更新
          </button>
        </div>
      </div>
      {error && <p className="px-8 py-2 text-red-500 text-sm bg-red-50">{error}</p>}

      {/* マップ本体 */}
      <div className="flex-1">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stores.map((s) => {
            const color = crowdColor(s.crowrd_level);
            const level = s.crowrd_level ?? 0;
            return (
              <CircleMarker
                key={s.store_id}
                center={[s.lat, s.lon]}
                radius={18}
                pathOptions={{
                  color: "white",
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div className="min-w-[160px]">
                    <p className="font-bold text-gray-800 text-base mb-1">{s.name}</p>
                    {s.address && <p className="text-gray-500 text-xs mb-2">{s.address}</p>}
                    <div
                      className="text-sm font-semibold mb-2"
                      style={{ color }}
                    >
                      {crowdLabel(s.crowrd_level)}
                    </div>
                    {s.crowrd_level !== undefined && s.capacity && (
                      <>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round(level * 100)}%`, backgroundColor: color }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          推定 {Math.round(level * s.capacity)} / {s.capacity} 人
                        </p>
                      </>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* 店舗なし時のオーバーレイ */}
      {stores.length === 0 && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 rounded-2xl px-8 py-6 shadow text-center">
            <p className="text-gray-500 text-sm">位置情報が登録されている店舗がありません。</p>
            <p className="text-gray-400 text-xs mt-1">「店舗管理」で緯度・経度を登録してください。</p>
          </div>
        </div>
      )}
    </div>
  );
}
