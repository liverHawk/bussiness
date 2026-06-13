import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAuth } from "../store/auth";
import { updateCongestion } from "../lib/api";

export default function Congestion() {
  const { storeId } = useAuth();
  const [count, setCount] = useState(0);
  const [capacity, setCapacity] = useState(50);
  const [capacityInput, setCapacityInput] = useState("");
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [ports, setPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState("COM3");
  const [message, setMessage] = useState("");

  const rate = capacity > 0 ? Math.min(count / capacity, 1) : 0;

  useEffect(() => {
    invoke<string[]>("get_serial_ports").then(setPorts);
    invoke<boolean>("get_esp32_connected").then(setEsp32Connected);
    invoke<number>("get_esp32_count").then(setCount);

    const u1 = listen<number>("esp32-count", (e) => setCount(e.payload));
    const u2 = listen<boolean>("esp32-connected", (e) => setEsp32Connected(e.payload));
    const interval = setInterval(() => syncServer(), 10000);

    return () => {
      u1.then((f) => f());
      u2.then((f) => f());
      clearInterval(interval);
    };
  }, []);

  const startEsp32 = () => invoke("start_esp32", { port: selectedPort, baud: 115200 });

  const syncServer = async () => {
    if (!storeId) return;
    try {
      await updateCongestion(storeId, rate);
      setMessage(`混雑度 ${Math.round(rate * 100)}% を送信しました`);
    } catch {
      setMessage("サーバー送信失敗");
    }
  };

  const saveCapacity = () => {
    const v = parseInt(capacityInput);
    if (!isNaN(v) && v > 0) { setCapacity(v); setCapacityInput(""); }
  };

  const barColor = rate < 0.5 ? "bg-emerald-500" : rate < 0.8 ? "bg-amber-500" : "bg-red-500";
  const textColor = rate < 0.5 ? "text-emerald-500" : rate < 0.8 ? "text-amber-500" : "text-red-500";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-700 mb-6">混雑モニター</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm text-gray-400 mb-2">検知スマホ台数（推定人数）</p>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-bold ${textColor}`}>{count}</span>
            <span className="text-gray-400 mb-1">/ {capacity} 人</span>
          </div>
          <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${rate * 100}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <p className="text-sm text-gray-400">ESP32 接続</p>
          <div className="flex gap-2">
            <select className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" value={selectedPort} onChange={(e) => setSelectedPort(e.target.value)}>
              {ports.length > 0 ? ports.map((p) => <option key={p}>{p}</option>) : <option>COM3</option>}
            </select>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition" onClick={startEsp32}>接続</button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${esp32Connected ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className={`text-sm font-medium ${esp32Connected ? "text-emerald-600" : "text-red-500"}`}>{esp32Connected ? "接続中" : "未接続"}</span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-500 mb-1">収容人数を変更</label>
          <div className="flex gap-2">
            <input className="border border-gray-300 rounded-lg px-3 py-2 w-36 focus:border-indigo-500 transition" placeholder="例: 50" value={capacityInput} onChange={(e) => setCapacityInput(e.target.value)} type="number" />
            <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition text-sm" onClick={saveCapacity}>更新</button>
          </div>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg transition text-sm font-medium" onClick={syncServer}>今すぐ同期</button>
        {message && <p className="text-sm text-indigo-500">{message}</p>}
      </div>
    </div>
  );
}
