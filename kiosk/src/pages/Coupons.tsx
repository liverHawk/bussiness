import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { getCoupons, createCoupon } from "../lib/api";

interface Coupon {
  coupon_id: string;
  title: string;
  description?: string | null;
  qr_code_url: string;
  expiry_date: string;
  required_coins: number;
}

export default function Coupons() {
  const { storeId } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [requiredCoins, setRequiredCoins] = useState("0");
  const [expiry, setExpiry]           = useState("");
  const [error, setError]   = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!storeId) return;
    getCoupons(storeId).then(setCoupons).catch(() => {});
  }, [storeId]);

  const issue = async () => {
    setError(""); setMessage("");
    if (!title || !expiry) { setError("タイトルと有効期限を入力してください"); return; }
    if (!storeId) { setError("店舗が未登録です"); return; }
    try {
      const c = await createCoupon({
        store_id: storeId,
        title,
        description: description || null,
        expiry_date: expiry,
        required_coins: parseInt(requiredCoins) || 0,
      });
      setCoupons([...coupons, c]);
      setTitle(""); setDescription(""); setRequiredCoins("0"); setExpiry("");
      setMessage("クーポンを発行しました（全ユーザーに配布されます）");
    } catch { setError("発行に失敗しました"); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-700 mb-6">クーポン管理</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-6 py-3">タイトル</th>
              <th className="text-left px-6 py-3">必要コイン</th>
              <th className="text-left px-6 py-3">有効期限</th>
              <th className="text-left px-6 py-3">QR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-300">クーポンがありません</td></tr>
            )}
            {coupons.map((c) => (
              <tr key={c.coupon_id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold text-indigo-600 whitespace-pre-line">{c.title}</td>
                <td className="px-6 py-3 text-emerald-600 font-medium">
                  {c.required_coins > 0 ? `${c.required_coins} コイン` : "無料"}
                </td>
                <td className="px-6 py-3 text-gray-400">{c.expiry_date ?? "—"}</td>
                <td className="px-6 py-3">
                  {c.qr_code_url && c.qr_code_url !== "pending" ? (
                    <a href={c.qr_code_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-600 underline text-xs">表示</a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-sm text-gray-500 mb-3 font-medium">新しいクーポンを発行</p>
        <div className="grid grid-cols-2 gap-3 max-w-2xl">
          <input className="col-span-2 border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" placeholder="タイトル（例：アイスコーヒー50円引き）" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="col-span-2 border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" placeholder="説明（任意）" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div>
            <label className="block text-xs text-gray-400 mb-1">必要コイン（0=無料）</label>
            <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" type="number" min="0" value={requiredCoins} onChange={(e) => setRequiredCoins(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">有効期限</label>
            <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
        </div>
        <button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition text-sm font-medium" onClick={issue}>発行</button>
        <p className="text-xs text-gray-400 mt-2">QR コードは発行時に自動生成されます。</p>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {message && <p className="text-emerald-500 text-sm mt-2">{message}</p>}
      </div>
    </div>
  );
}
