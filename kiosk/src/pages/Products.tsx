import { useEffect, useState } from "react";
import { useAuth } from "../store/auth";
import { getProducts, createProduct, deleteProduct } from "../lib/api";

interface Product { id: string; name: string; price: number; }

export default function Products() {
  const { storeId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName]   = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!storeId) return;
    getProducts(storeId).then(setProducts).catch(() => {});
  }, [storeId]);

  const add = async () => {
    setError(""); setMessage("");
    if (!name || !price) { setError("商品名と価格を入力してください"); return; }
    if (!storeId) { setError("店舗が未登録です"); return; }
    try {
      const p = await createProduct(storeId, { name, price: parseInt(price) });
      setProducts([...products, p]);
      setName(""); setPrice("");
      setMessage("商品を追加しました");
    } catch { setError("追加に失敗しました"); }
  };

  const del = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
    } catch { setError("削除に失敗しました"); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-700 mb-6">商品管理</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-6 py-3">商品名</th>
              <th className="text-right px-6 py-3">価格</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-300">商品がありません</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-700 font-medium">{p.name}</td>
                <td className="px-6 py-3 text-right text-gray-600">¥{p.price.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1 rounded-md transition" onClick={() => del(p.id)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-sm text-gray-500 mb-3 font-medium">新しい商品を追加</p>
        <div className="flex gap-3">
          <input className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" placeholder="商品名" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-36 border border-gray-300 rounded-lg px-4 py-2.5 focus:border-indigo-500 transition text-sm" placeholder="価格（円）" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg transition text-sm font-medium" onClick={add}>追加</button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {message && <p className="text-emerald-500 text-sm mt-2">{message}</p>}
      </div>
    </div>
  );
}
