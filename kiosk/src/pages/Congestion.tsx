import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAuth } from "../store/auth";
import { updateCongestion } from "../lib/api";

// 補正係数のデフォルト（iOSランダムMAC研究値ベース: 日本のシェアで加重平均 ≈ 4.3）
const DEFAULT_FACTOR = 4.3;
const RSSI_RANGE_KEY = "kiosk_rssi_range";
const DEFAULT_RANGE = 100;

function rangeToRssi(range: number): number {
  if (range >= 100) return -127;
  return Math.round(-50 - (range / 100) * 40);
}

function rssiToRange(rssi: number): number {
  if (rssi <= -127) return 100;
  if (rssi >= -50) return 0;
  return Math.round(((-50 - rssi) / 40) * 100);
}

function rangeLabel(range: number): string {
  if (range >= 100) return "広い（フィルタなし）";
  if (range <= 25) return "狭い";
  if (range <= 75) return "標準";
  return "やや広い";
}

function loadSavedRange(): number {
  const saved = localStorage.getItem(RSSI_RANGE_KEY);
  if (saved === null) return DEFAULT_RANGE;
  const parsed = parseFloat(saved);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : DEFAULT_RANGE;
}

export default function Congestion() {
  const { storeId } = useAuth();
  const [rawCount, setRawCount] = useState(0);       // ESP32 からの生値
  const [factor, setFactor] = useState(DEFAULT_FACTOR); // 補正係数
  const [capacity, setCapacity] = useState(50);
  const [capacityInput, setCapacityInput] = useState("");
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [ports, setPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState("COM3");
  const [message, setMessage] = useState("");
  const [arduinoProgress, setArduinoProgress] = useState("");
  const [arduinoReady, setArduinoReady] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [detectionRange, setDetectionRange] = useState(loadSavedRange);
  const [rssiMin, setRssiMin] = useState(rangeToRssi(loadSavedRange()));
  const [rssiPending, setRssiPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectionRangeRef = useRef(detectionRange);
  useEffect(() => {
    detectionRangeRef.current = detectionRange;
  }, [detectionRange]);

  // 補正後の推定人数
  const count = Math.round(rawCount / factor);
  const rate = capacity > 0 ? Math.min(count / capacity, 1) : 0;
  const rssiDisplay = rssiMin <= -127 ? "フィルタなし" : `${rssiMin} dBm`;

  const applyRssiToEsp32 = useCallback(async (range: number) => {
    const nextRssi = rangeToRssi(range);
    setRssiMin(nextRssi);
    localStorage.setItem(RSSI_RANGE_KEY, String(range));
    if (!esp32Connected) return;
    setRssiPending(true);
    try {
      await invoke("set_esp32_rssi_min", { rssiMin: nextRssi });
    } catch (e) {
      setMessage(typeof e === "string" ? e : "RSSI 設定の送信に失敗しました");
    } finally {
      setRssiPending(false);
    }
  }, [esp32Connected]);

  useEffect(() => {
    invoke<string[]>("get_serial_ports").then(setPorts);
    invoke<boolean>("get_esp32_connected").then(setEsp32Connected);
    invoke<number>("get_esp32_count").then(setRawCount);
    invoke<boolean>("check_arduino_cli").then(setArduinoReady);
    invoke<number>("get_esp32_rssi_min").then((v) => {
      setRssiMin(v);
      setDetectionRange(rssiToRange(v));
    });

    const u1 = listen<number>("esp32-count", (e) => setRawCount(e.payload));
    const u2 = listen<boolean>("esp32-connected", (e) => setEsp32Connected(e.payload));
    const u5 = listen<number>("esp32-rssi-min", (e) => {
      setRssiMin(e.payload);
      setDetectionRange(rssiToRange(e.payload));
    });
    const u3 = listen<string>("arduino-progress", (e) => {
      const msg = e.payload;
      setArduinoProgress(msg);
      if (msg.startsWith("DONE")) { setArduinoReady(true); }
      if (msg.startsWith("DONE") || msg.startsWith("ERROR")) setFlashing(false);
    });
    // 書き込み完了後の自動再接続
    const u4 = listen<string>("esp32-reconnect", (e) => {
      invoke("start_esp32", {
        port: e.payload,
        baud: 115200,
        rssiMin: rangeToRssi(detectionRangeRef.current),
      });
    });

    const interval = setInterval(() => syncServer(), 10000);

    return () => {
      u1.then((f) => f());
      u2.then((f) => f());
      u5.then((f) => f());
      u3.then((f) => f());
      u4.then((f) => f());
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void applyRssiToEsp32(detectionRange);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [detectionRange, applyRssiToEsp32]);

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

  const startEsp32 = () =>
    invoke("start_esp32", {
      port: selectedPort,
      baud: 115200,
      rssiMin: rangeToRssi(detectionRange),
    });
  const stopEsp32  = () => invoke("stop_esp32");

  const setupArduino = () => {
    setArduinoProgress("セットアップを開始します…");
    invoke("setup_arduino_cli");
  };

  const flashSketch = () => {
    setFlashing(true);
    setArduinoProgress("シリアル切断 → 書き込み開始…");
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
          <p className="text-sm text-gray-400 mb-1">推定人数（補正後）</p>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-bold ${textColor}`}>{count}</span>
            <span className="text-gray-400 mb-1">/ {capacity} 人</span>
          </div>
          <div className="mt-3 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${rate * 100}%` }} />
          </div>
          <p className="text-xs text-gray-300 mt-2">
            生値: {rawCount} ユニークMAC ÷ 補正係数 {factor} = {count} 人
          </p>
        </div>

        {/* ESP32 接続 */}
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
            <button className="bg-slate-500 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-lg transition" onClick={detectPort}>自動検知</button>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-2 rounded-lg transition" onClick={startEsp32}>接続</button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${esp32Connected ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className={`text-sm font-medium ${esp32Connected ? "text-emerald-600" : "text-red-500"}`}>
                {esp32Connected ? "接続中" : "未接続"}
              </span>
            </div>
            {esp32Connected && (
              <button className="text-xs text-gray-400 hover:text-red-500 transition" onClick={stopEsp32}>切断</button>
            )}
          </div>
        </div>
      </div>

      {/* 検知範囲（RSSI） */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 font-medium">検知範囲（電波強度）</p>
          <div className="text-right">
            <span className="text-sm font-bold text-indigo-600">{rssiDisplay}</span>
            <span className="text-xs text-gray-400 ml-2">{rangeLabel(detectionRange)}</span>
            {rssiPending && <span className="text-xs text-gray-300 ml-2">送信中…</span>}
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={detectionRange}
          onChange={(e) => setDetectionRange(parseInt(e.target.value, 10))}
          disabled={!esp32Connected}
          className={`w-full accent-indigo-600 ${!esp32Connected ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        <div className="flex justify-between text-xs text-gray-300 mt-1">
          <span>狭い（-50 dBm）</span>
          <span className="text-gray-400">標準 ≈ -70 dBm</span>
          <span>広い（フィルタなし）</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {esp32Connected
            ? "左に動かすほど強い電波のみを検知し、店内に限定しやすくなります。壁・人混み・アンテナ位置で変わるため、実人数と照合して調整してください。"
            : "ESP32 接続後に調整できます。初回はスケッチ書き込みが必要です。"}
        </p>
      </div>

      {/* 補正係数 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 font-medium">ランダムMAC補正係数</p>
          <span className="text-sm font-bold text-indigo-600">÷ {factor}</span>
        </div>
        <input
          type="range" min="1" max="15" step="0.1"
          value={factor}
          onChange={(e) => setFactor(parseFloat(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-300 mt-1">
          <span>1（補正なし）</span>
          <span className="text-gray-400">← デフォルト {DEFAULT_FACTOR}（日本シェア加重平均）</span>
          <span>15</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          iOSは30秒で1台あたり約6〜15個のランダムMACを送出。Androidは1〜2個。
          日本のスマホシェア（iPhone 55% / Android 45%）で加重平均すると約4.3。
          実環境で実人数と照合して調整してください。
        </p>
      </div>

      {/* スケッチ書き込み */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <p className="text-sm text-gray-500 font-medium mb-3">ESP32 スケッチ書き込み</p>
        <p className="text-xs text-gray-400 mb-3">書き込み中は自動でシリアル切断→書き込み→再接続を行います。</p>
        <div className="flex gap-3 flex-wrap items-center">
          {!arduinoReady ? (
            <button className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg transition" onClick={setupArduino}>
              arduino-cli をセットアップ
            </button>
          ) : (
            <>
              <span className="text-emerald-600 text-sm font-medium">✓ arduino-cli 準備完了</span>
              <button className="bg-slate-500 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-lg transition" onClick={setupArduino} title="ESP32 ボードパッケージの再インストール">
                ESP32コアを再インストール
              </button>
            </>
          )}
          <button
            className={`text-white text-sm px-4 py-2 rounded-lg transition ${
              flashing || !arduinoReady ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
            onClick={flashSketch}
            disabled={flashing || !arduinoReady}
          >
            {flashing ? "書き込み中…" : `${selectedPort} へ書き込む`}
          </button>
        </div>
        {arduinoProgress && (
          <pre className={`mt-3 text-xs rounded-lg p-3 whitespace-pre-wrap ${
            arduinoProgress.startsWith("ERROR") ? "bg-red-50 text-red-600"
            : arduinoProgress.startsWith("DONE") ? "bg-emerald-50 text-emerald-700"
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
              placeholder="例: 50" value={capacityInput}
              onChange={(e) => setCapacityInput(e.target.value)} type="number"
            />
            <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition text-sm" onClick={saveCapacity}>更新</button>
          </div>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg transition text-sm font-medium" onClick={syncServer}>
          今すぐ同期
        </button>
        {message && <p className="text-sm text-indigo-500">{message}</p>}
      </div>
    </div>
  );
}
