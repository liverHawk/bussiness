import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { getCoupons, createCoupon } from "../lib/api";

interface Coupon { id: string; code: string; discount_rate: number; expires_at?: string; }

export default function Coupons() {
  const { storeId } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode]         = useState("");
  const [discount, setDiscount] = useState("");
  const [expires, setExpires]   = useState("");
  const [error, setError]   = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!storeId) return;
    getCoupons(storeId).then(setCoupons).catch(() => {});
  }, [storeId]);

  const issue = async () => {
    setError(""); setMessage("");
    if (!code || !discount) { setError("コードと割引率を入力してください"); return; }
    if (!storeId) { setError("店舗が未登録です"); return; }
    try {
      const c = await createCoupon({ store_id: storeId, code, discount_rate: parseFloat(discount) / 100, expires_at: expires || null });
      setCoupons([...coupons, c]);
      setCode(""); setDiscount(""); setExpires("");
      setMessage("クーポンを発行しました");
    } catch { setError("発行に失敗しました"); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-700 mb-6">クーポン管理</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-6 py-3">コード</th>
              <th className="text-left px-6 py-3">割引率</th>
              <th className="text-left px-6 py-3">有効期限</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-300">クーポンがありません</td></tr>
            )}
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-mono font-semibold text-indigo-600">{c.code}</td>
                <td className="px-6 py-3 text-emerald-600 font-medium">{Math.round(c.discount_rate * 100)}% OFF</td>
                <td className="px-6 py-3 text-gray-400">{c.expires_at ? c.expires_at.slice(0, 10) : "無期限"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-sm text-gray-500 mb-3 font-medium">新しいクーポンを発行</p>
        <div className="flex gap-3 flex-wrap">
          <input className="w-40 border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" placeholder="コード" value={code} onChange={(e) => setCode(e.target.value)} />
          <input className="w-32 border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" placeholder="割引率（%）" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          <input className="w-44 border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" placeholder="有効期限 YYYY-MM-DD" value={expires} onChange={(e) => setExpires(e.target.value)} />
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition text-sm font-medium" onClick={issue}>発行</button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {message && <p className="text-emerald-500 text-sm mt-2">{message}</p>}
      </div>
    </div>
  );
}
