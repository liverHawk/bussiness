import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useAuth } from "../store/auth";
import { getProducts, processPayment } from "../lib/api";

interface Product { id: string; name: string; price: number; }
interface CartItem { product: Product; qty: number; }

export default function Payment() {
  const { storeId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [coupon, setCoupon]     = useState("");
  const [scanning, setScanning] = useState(false);
  const [userId, setUserId]     = useState<string | null>(null);
  const [message, setMessage]   = useState("");
  const [error, setError]       = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!storeId) return;
    getProducts(storeId).then(setProducts).catch(() => {});
  }, [storeId]);

  const startScan = async () => {
    setScanning(true); setUserId(null);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    const tick = () => {
      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) { requestAnimationFrame(tick); return; }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height);
      if (code) { setUserId(code.data); stopScan(); } else { requestAnimationFrame(tick); }
    };
    requestAnimationFrame(tick);
  };

  const stopScan = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  };

  const total = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  const pay = async () => {
    setError(""); setMessage("");
    if (!userId) { setError("先にQRコードをスキャンしてください"); return; }
    if (cart.length === 0) { setError("商品を選択してください"); return; }
    try {
      const result = await processPayment({
        user_id: userId, store_id: storeId!,
        items: cart.map((i) => ({ merchandise_id: i.product.id, qty: i.qty })),
        coupon_code: coupon || null,
      });
      setMessage(`¥${(result as any).total.toLocaleString()} の決済が完了しました！`);
      setCart([]); setUserId(null); setCoupon("");
    } catch (e: any) { setError(e.message ?? "決済に失敗しました"); }
  };

  const reset = () => { setCart([]); setUserId(null); setCoupon(""); setMessage(""); setError(""); stopScan(); };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-700 mb-6">決済</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-3 font-medium">お客様QRコード</p>
            {scanning ? (
              <div className="space-y-2">
                <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                <button className="text-sm text-gray-400 hover:text-gray-600" onClick={stopScan}>キャンセル</button>
              </div>
            ) : (
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg transition font-medium" onClick={startScan}>QRコードをスキャン</button>
            )}
            {userId && <p className="mt-2 text-emerald-600 text-sm font-medium">✓ ユーザー認識完了</p>}
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-3 font-medium">商品を選択</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {products.map((p) => (
                <button key={p.id} className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50 hover:bg-indigo-50 rounded-lg transition text-sm" onClick={() => addToCart(p)}>
                  <span className="text-gray-700">{p.name}</span>
                  <span className="text-indigo-600 font-medium">¥{p.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-3 font-medium">カート</p>
            {cart.length === 0
              ? <p className="text-gray-300 text-sm">商品が選択されていません</p>
              : (
                <div className="space-y-2 mb-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm text-gray-700">
                      <span>{item.product.name} × {item.qty}</span>
                      <span>¥{(item.product.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold text-gray-800">
                    <span>合計</span><span>¥{total.toLocaleString()}</span>
                  </div>
                </div>
              )
            }
            <label className="block text-sm text-gray-500 mb-1">クーポンコード（任意）</label>
            <input className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 transition mb-4" placeholder="例：SUMMER10" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            {message && <p className="text-emerald-500 font-semibold text-center mb-2">{message}</p>}
            <div className="flex gap-3">
              <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg transition font-bold" onClick={pay}>決済する</button>
              <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg transition text-sm" onClick={reset}>リセット</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
