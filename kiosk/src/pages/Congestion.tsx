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
  const [arduinoProgress, setArduinoProgress] = useState("");
  const [arduinoReady, setArduinoReady] = useState(false);
  const [flashing, setFlashing] = useState(false);

  const rate = capacity > 0 ? Math.min(count / capacity, 1) : 0;

  useEffect(() => {
    invoke<string[]>("get_serial_ports").then(setPorts);
    invoke<boolean>("get_esp32_connected").then(setEsp32Connected);
    invoke<number>("get_esp32_count").then(setCount);
    invoke<boolean>("check_arduino_cli").then(setArduinoReady);

    const u1 = listen<number>("esp32-count", (e) => setCount(e.payload));
    const u2 = listen<boolean>("esp32-connected", (e) => setEsp32Connected(e.payload));
    const u3 = listen<string>("arduino-progress", (e) => {
      const msg = e.payload;
      setArduinoProgress(msg);
      if (msg.startsWith("DONE")) setArduinoReady(true);
      if (msg.startsWith("DONE") || msg.startsWith("ERROR")) setFlashing(false);
    });
    const interval = setInterval(() => syncServer(), 10000);

    return () => {
      u1.then((f) => f());
      u2.then((f) => f());
      u3.then((f) => f());
      clearInterval(interval);
    };
  }, []);

  const detectPort = async () => {
    const port = await invoke<string | null>("detect_esp32_port");
    if (port) {
      setSelectedPort(port);
      const all = await invoke<string[]>("get_serial_ports");
      setPorts(all);
      setMessage(`ESP32 を自動検知しました: ${port}`);
    } else {
      setMessage("ESP32 が見つかりませんでした。手動で選択してください。");
    }
  };

  const startEsp32 = () => invoke("start_esp32", { port: selectedPort, baud: 115200 });

  const setupArduino = () => {
    setArduinoProgress("セットアップを開始します…");
    invoke("setup_arduino_cli");
  };

  const flashSketch = () => {
    setFlashing(true);
    setArduinoProgress("書き込みを開始します…");
    invoke("flash_esp32", { port: selectedPort });
  };

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
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 混雑度メーター */}
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

        {/* ESP32 接続パネル */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <p className="text-sm text-gray-400 font-medium">ESP32 接続</p>
          <div className="flex gap-2">
            <select
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
            >
              {ports.length > 0 ? ports.map((p) => <option key={p}>{p}</option>) : <option>{selectedPort}</option>}
            </select>
            <button
              className="bg-slate-500 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-lg transition"
              onClick={detectPort}
              title="USB に接続された ESP32 を自動検知"
            >
              自動検知
            </button>
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-2 rounded-lg transition"
              onClick={startEsp32}
            >
              接続
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${esp32Connected ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className={`text-sm font-medium ${esp32Connected ? "text-emerald-600" : "text-red-500"}`}>
              {esp32Connected ? "接続中" : "未接続"}
            </span>
          </div>
        </div>
      </div>

      {/* スケッチ書き込みパネル */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <p className="text-sm text-gray-500 font-medium mb-3">ESP32 スケッチ書き込み</p>
        <div className="flex gap-3 flex-wrap items-center">
          {!arduinoReady ? (
            <button
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg transition"
              onClick={setupArduino}
            >
              arduino-cli をセットアップ
            </button>
          ) : (
            <>
              <span className="text-emerald-600 text-sm font-medium">✓ arduino-cli 準備完了</span>
              <button
                className="bg-slate-500 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-lg transition"
                onClick={setupArduino}
                title="ESP32 ボードパッケージの再インストール・更新"
              >
                ESP32コアを再インストール
              </button>
            </>
          )}
          <button
            className={`text-white text-sm px-4 py-2 rounded-lg transition ${
              flashing || !arduinoReady
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
            onClick={flashSketch}
            disabled={flashing || !arduinoReady}
          >
            {flashing ? "書き込み中…" : `${selectedPort} へ書き込む`}
          </button>
        </div>
        {arduinoProgress && (
          <pre className={`mt-3 text-xs rounded-lg p-3 whitespace-pre-wrap ${
            arduinoProgress.startsWith("ERROR")
              ? "bg-red-50 text-red-600"
              : arduinoProgress.startsWith("DONE")
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-50 text-gray-600"
          }`}>
            {arduinoProgress}
          </pre>
        )}
      </div>

      {/* 収容人数・同期 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-500 mb-1">収容人数を変更</label>
          <div className="flex gap-2">
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 w-36 focus:border-indigo-500 transition"
              placeholder="例: 50"
              value={capacityInput}
              onChange={(e) => setCapacityInput(e.target.value)}
              type="number"
            />
            <button
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition text-sm"
              onClick={saveCapacity}
            >
              更新
            </button>
          </div>
        </div>
        <button
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg transition text-sm font-medium"
          onClick={syncServer}
        >
          今すぐ同期
        </button>
        {message && <p className="text-sm text-indigo-500">{message}</p>}
      </div>
    </div>
  );
}
