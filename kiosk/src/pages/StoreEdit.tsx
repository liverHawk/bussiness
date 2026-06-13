import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { getMyStore, createStore, updateStore } from "../lib/api";

export default function StoreEdit() {
  const { token, storeId, setStore } = useAuth();
  const [name, setName]         = useState("");
  const [address, setAddress]   = useState("");
  const [lat, setLat]           = useState("");
  const [lon, setLon]           = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState("");
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    if (!token || loaded) return;
    getMyStore(token).then((s) => {
      if (s) {
        setName(s.name ?? "");
        setAddress(s.address ?? "");
        setLat(String(s.lat ?? ""));
        setLon(String(s.lon ?? ""));
        setCapacity(String(s.capacity ?? ""));
        setStore(s.id, s.name);
      }
    }).catch(() => {}).finally(() => setLoaded(true));
  }, [token]);

  const payload = () => ({
    name, address,
    lat: parseFloat(lat) || 0,
    lon: parseFloat(lon) || 0,
    capacity: parseInt(capacity) || 0,
  });

  const save = async () => {
    setError(""); setMessage("");
    try {
      if (storeId) {
        const s = await updateStore(token!, storeId, payload());
        setStore(s.id, s.name);
        setMessage("店舗情報を更新しました");
      } else {
        setError("店舗が未登録です。「新規登録」を押してください。");
      }
    } catch { setError("更新に失敗しました"); }
  };

  const create = async () => {
    setError(""); setMessage("");
    try {
      const s = await createStore(token!, payload());
      setStore(s.id, s.name);
      setMessage("店舗を登録しました");
    } catch { setError("登録に失敗しました"); }
  };

  const field = (label: string, value: string, set: (v: string) => void, props = {}) => (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        value={value} onChange={(e) => set(e.target.value)} {...props}
      />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-700 mb-6">店舗情報編集</h1>
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-xl space-y-4">
        {field("店舗名", name, setName, { placeholder: "例：カフェ58" })}
        {field("住所", address, setAddress, { placeholder: "大阪市住吉区..." })}
        <div className="grid grid-cols-2 gap-4">
          {field("緯度", lat, setLat, { placeholder: "34.6937" })}
          {field("経度", lon, setLon, { placeholder: "135.5023" })}
        </div>
        {field("収容人数", capacity, setCapacity, { type: "number", placeholder: "50" })}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-emerald-500 text-sm">{message}</p>}

        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg transition font-medium"
            onClick={save}
          >
            保存
          </button>
          <button
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg transition font-medium"
            onClick={create}
          >
            新規登録
          </button>
        </div>
      </div>
    </div>
  );
}
