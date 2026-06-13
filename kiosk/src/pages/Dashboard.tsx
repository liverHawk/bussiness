import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "../store/auth";

function congestionColor(rate: number) {
  if (rate < 0.5) return "text-emerald-500";
  if (rate < 0.8) return "text-amber-500";
  return "text-red-500";
}
function barColor(rate: number) {
  if (rate < 0.5) return "bg-emerald-500";
  if (rate < 0.8) return "bg-amber-500";
  return "bg-red-500";
}

export default function Dashboard() {
  const { userName, storeName, storeId } = useAuth();
  const [count, setCount] = useState(0);
  const [capacity, setCapacity] = useState(50);
  const [esp32Connected, setEsp32Connected] = useState(false);

  useEffect(() => {
    invoke<boolean>("get_esp32_connected").then(setEsp32Connected);
    invoke<number>("get_esp32_count").then(setCount);

    const unlistenCount = listen<number>("esp32-count", (e) => setCount(e.payload));
    const unlistenConn  = listen<boolean>("esp32-connected", (e) => setEsp32Connected(e.payload));

    return () => {
      unlistenCount.then((f) => f());
      unlistenConn.then((f) => f());
    };
  }, []);

  const rate = capacity > 0 ? Math.min(count / capacity, 1) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-700 mb-1">ダッシュボード</h1>
      <p className="text-sm text-gray-400 mb-6">店舗: {storeName ?? "（未登録）"}</p>

      <div className="grid grid-cols-3 gap-4">
        {/* 混雑カード */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm text-gray-400 mb-2">現在の混雑状況</p>
          <p className={`text-6xl font-bold ${congestionColor(rate)}`}>
            {Math.round(rate * 100)}%
          </p>
          <p className="text-gray-500 mt-2">{count} / {capacity} 人</p>
          <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor(rate)}`}
              style={{ width: `${rate * 100}%` }}
            />
          </div>
        </div>

        {/* ESP32 ステータス */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <p className="text-sm text-gray-400">ESP32</p>
          <div>
            <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${esp32Connected ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className={`font-semibold ${esp32Connected ? "text-emerald-600" : "text-red-500"}`}>
              {esp32Connected ? "接続中" : "未接続"}
            </span>
          </div>
        </div>

        {/* ユーザー情報 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm text-gray-400 mb-1">ログインユーザー</p>
          <p className="font-semibold text-gray-700">{userName ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
