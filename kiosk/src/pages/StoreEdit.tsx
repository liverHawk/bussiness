import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../store/auth";
import { getMyStores, createStore, updateStore } from "../lib/api";

// Vite バンドル対策
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface StoreForm {
  name: string; address: string; lat: string; lon: string; capacity: string;
}

const empty = (): StoreForm => ({ name: "", address: "", lat: "", lon: "", capacity: "" });

/** マップクリックで親に緯度経度を渡すコンポーネント */
function MapPicker({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function StoreEdit() {
  const { userId, stores, activeStoreId, setStores, addStore, updateStoreInList, setActiveStore } = useAuth();
  const [form, setForm] = useState<StoreForm>(empty());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getMyStores(userId).then(setStores).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const s = stores.find((x) => x.store_id === activeStoreId);
    if (s) {
      setForm({
        name: s.name ?? "",
        address: s.address ?? "",
        lat: String(s.lat ?? ""),
        lon: String(s.lon ?? ""),
        capacity: String(s.capacity ?? ""),
      });
    } else {
      setForm(empty());
    }
    setError(""); setMessage("");
  }, [activeStoreId, stores]);

  const handleMapPick = (lat: number, lon: number) => {
    setForm((f) => ({
      ...f,
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
    }));
  };

  const payload = () => ({
    name: form.name,
    address: form.address,
    lat: parseFloat(form.lat) || 0,
    lon: parseFloat(form.lon) || 0,
    capacity: parseInt(form.capacity) || 0,
  });

  const f = (label: string, key: keyof StoreForm, props: Record<string, unknown> = {}) => (
    <div key={key}>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...props}
      />
    </div>
  );

  const save = async () => {
    setError(""); setMessage("");
    if (!activeStoreId) { setError("店舗を選択するか新規登録してください"); return; }
    try {
      const s = await updateStore(activeStoreId, payload());
      updateStoreInList(s);
      setMessage("保存しました");
    } catch { setError("保存に失敗しました"); }
  };

  const create = async () => {
    setError(""); setMessage("");
    if (!userId) { setError("ログインしてください"); return; }
    if (!form.name) { setError("店舗名を入力してください"); return; }
    try {
      const s = await createStore({ ...payload(), owner: userId });
      addStore(s);
      setActiveStore(s.store_id);
      setMessage("店舗を登録しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  // マーカー位置（数値として有効な場合のみ）
  const markerPos: [number, number] | null =
    parseFloat(form.lat) && parseFloat(form.lon)
      ? [parseFloat(form.lat), parseFloat(form.lon)]
      : null;

  // マップの中心（マーカーがあればそこ、なければ大阪公立大学周辺）
  const mapCenter: [number, number] = markerPos ?? [34.5446, 135.5064];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-700 mb-6">店舗情報編集</h1>
      <div className="grid grid-cols-3 gap-6">
        {/* 店舗一覧 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-medium mb-3">登録済み店舗</p>
          <div className="space-y-1">
            {stores.length === 0 && (
              <p className="text-gray-300 text-sm">店舗がありません</p>
            )}
            {stores.map((s) => (
              <button
                key={s.store_id}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                  s.store_id === activeStoreId
                    ? "bg-indigo-600 text-white font-semibold"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => setActiveStore(s.store_id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <button
            className="mt-4 w-full text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-300 hover:border-indigo-500 py-2 rounded-lg transition"
            onClick={() => { setActiveStore(""); setForm(empty()); setMessage(""); setError(""); }}
          >
            ＋ 新規登録フォーム
          </button>
        </div>

        {/* 編集フォーム */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm p-8 space-y-4">
          <p className="text-sm font-semibold text-gray-600">
            {activeStoreId ? "店舗情報を編集" : "新しい店舗を登録"}
          </p>
          {f("店舗名", "name", { placeholder: "例：カフェ58" })}
          {f("住所", "address", { placeholder: "大阪市住吉区杉本3丁目..." })}

          {/* 緯度経度 + マップピッカー */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-gray-500">位置（緯度 / 経度）</label>
              <button
                type="button"
                className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                onClick={() => setShowMap((v) => !v)}
              >
                {showMap ? "マップを閉じる" : "マップで選択する"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
                placeholder="緯度 例: 34.5446"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
              <input
                className="border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
                placeholder="経度 例: 135.5064"
                value={form.lon}
                onChange={(e) => setForm({ ...form, lon: e.target.value })}
              />
            </div>

            {/* インラインマップピッカー */}
            {showMap && (
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-200" style={{ height: 280 }}>
                <MapContainer
                  key={`${mapCenter[0]}-${mapCenter[1]}`}
                  center={mapCenter}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapPicker onPick={handleMapPick} />
                  {markerPos && <Marker position={markerPos} />}
                </MapContainer>
                <p className="text-xs text-gray-400 text-center py-1 bg-gray-50">
                  クリックした場所が緯度・経度に自動入力されます
                </p>
              </div>
            )}
          </div>

          {f("収容人数", "capacity", { type: "number", placeholder: "50" })}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-emerald-500 text-sm">{message}</p>}

          <div className="flex gap-3 pt-2">
            {activeStoreId ? (
              <button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg transition font-medium"
                onClick={save}
              >
                保存
              </button>
            ) : (
              <button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg transition font-medium"
                onClick={create}
              >
                新規登録
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
