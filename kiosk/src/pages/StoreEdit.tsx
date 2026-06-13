import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { getMyStores, createStore, updateStore } from "../lib/api";

interface StoreForm {
  name: string; address: string; lat: string; lon: string; capacity: string;
}

const empty = (): StoreForm => ({ name: "", address: "", lat: "", lon: "", capacity: "" });

export default function StoreEdit() {
  const { userId, stores, activeStoreId, setStores, addStore, updateStoreInList, setActiveStore } = useAuth();
  const [form, setForm] = useState<StoreForm>(empty());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userId) return;
    getMyStores(userId).then((list) => {
      setStores(list);
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const s = stores.find((x) => x.id === activeStoreId);
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
    if (!form.name) { setError("店舗名を入力してください"); return; }
    try {
      const s = await createStore({ ...payload(), owner_id: userId! });
      addStore(s);
      setActiveStore(s.id);
      setMessage("店舗を登録しました");
    } catch { setError("登録に失敗しました"); }
  };

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
                key={s.id}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                  s.id === activeStoreId
                    ? "bg-indigo-600 text-white font-semibold"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => setActiveStore(s.id)}
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
          <div className="grid grid-cols-2 gap-4">
            {f("緯度", "lat", { placeholder: "34.5446" })}
            {f("経度", "lon", { placeholder: "135.5064" })}
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
