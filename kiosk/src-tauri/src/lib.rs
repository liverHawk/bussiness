use std::io::Write as IoWrite;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

const ESP32_KEYWORDS: &[&str] = &[
    "CP210", "CH340", "CH341", "FTDI", "USB Serial", "USB-SERIAL", "ESP32",
];

// ── スケッチ ───────────────────────────────────────────────────────────────
// 設計:
//   - 全 Wi-Fi チャンネル (1-13ch) を 200ms ずつホッピング
//   - ISR はリングバッファに MAC を書くだけ（std::map は安全にメインループで操作）
//   - 30 秒スライディングウィンドウでユニーク MAC を管理
//   - RSSI フィルタなし（広範囲検知）
const SKETCH: &str = r#"
#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include <map>
#include <string>
#include <string.h>

#define WINDOW_SEC      30
#define CHANNEL_DWELL   200
#define MAX_CHANNEL     13
#define MAC_BUF_SIZE    64

static uint8_t  mac_buf[MAC_BUF_SIZE][6];
static volatile int buf_head = 0;
static volatile int buf_tail = 0;
static std::map<std::string, unsigned long> mac_table;

void IRAM_ATTR sniffer_cb(void* buf, wifi_promiscuous_pkt_type_t type) {
  if (type != WIFI_PKT_MGMT) return;
  const wifi_promiscuous_pkt_t* pkt = (const wifi_promiscuous_pkt_t*)buf;
  const uint8_t* payload = pkt->payload;
  if ((payload[0] & 0xFC) != 0x40) return;
  int next = (buf_head + 1) % MAC_BUF_SIZE;
  if (next != buf_tail) {
    memcpy(mac_buf[buf_head], payload + 10, 6);
    buf_head = next;
  }
}

static std::string mac_to_str(const uint8_t* m) {
  char s[13];
  snprintf(s, sizeof(s), "%02x%02x%02x%02x%02x%02x",
           m[0], m[1], m[2], m[3], m[4], m[5]);
  return std::string(s);
}

void setup() {
  Serial.begin(115200);
  nvs_flash_init();
  esp_netif_init();
  esp_event_loop_create_default();
  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
  esp_wifi_init(&cfg);
  esp_wifi_set_storage(WIFI_STORAGE_RAM);
  esp_wifi_set_mode(WIFI_MODE_NULL);
  esp_wifi_start();
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_promiscuous_rx_cb(&sniffer_cb);
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE);
}

void loop() {
  static uint8_t  ch = 1;
  static unsigned long last_report = 0;

  esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
  ch = (ch % MAX_CHANNEL) + 1;
  delay(CHANNEL_DWELL);

  unsigned long now = millis();

  while (buf_tail != buf_head) {
    mac_table[mac_to_str(mac_buf[buf_tail])] = now;
    buf_tail = (buf_tail + 1) % MAC_BUF_SIZE;
  }

  const unsigned long win = (unsigned long)WINDOW_SEC * 1000UL;
  for (auto it = mac_table.begin(); it != mac_table.end(); ) {
    it = (now - it->second > win) ? mac_table.erase(it) : std::next(it);
  }

  if (now - last_report >= 1000UL) {
    Serial.println((int)mac_table.size());
    last_report = now;
  }
}
"#;

// ── 状態 ──────────────────────────────────────────────────────────────────

struct Esp32State {
    count: Mutex<i32>,
    connected: Mutex<bool>,
    stop_flag: AtomicBool,   // true にするとシリアル読み取りスレッドが終了
}

// ── シリアルポート ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_serial_ports() -> Vec<String> {
    serialport::available_ports()
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.port_name)
        .collect()
}

#[tauri::command]
fn detect_esp32_port() -> Option<String> {
    let ports = serialport::available_ports().unwrap_or_default();
    for port in &ports {
        let desc = match &port.port_type {
            serialport::SerialPortType::UsbPort(info) => {
                let product = info.product.clone().unwrap_or_default();
                let manufacturer = info.manufacturer.clone().unwrap_or_default();
                format!("{} {}", product, manufacturer).to_uppercase()
            }
            _ => continue,
        };
        if ESP32_KEYWORDS.iter().any(|kw| desc.contains(*kw)) {
            return Some(port.port_name.clone());
        }
    }
    let usb_ports: Vec<_> = ports
        .iter()
        .filter(|p| matches!(p.port_type, serialport::SerialPortType::UsbPort(_)))
        .collect();
    if usb_ports.len() == 1 {
        return Some(usb_ports[0].port_name.clone());
    }
    None
}

// ── ESP32 シリアル読み取り ─────────────────────────────────────────────────

#[tauri::command]
fn get_esp32_count(state: State<Arc<Esp32State>>) -> i32 {
    *state.count.lock().unwrap()
}

#[tauri::command]
fn get_esp32_connected(state: State<Arc<Esp32State>>) -> bool {
    *state.connected.lock().unwrap()
}

/// シリアル読み取りスレッドを停止してポートを解放する
#[tauri::command]
fn stop_esp32(state: State<Arc<Esp32State>>, app: AppHandle) {
    state.stop_flag.store(true, Ordering::Relaxed);
    *state.connected.lock().unwrap() = false;
    let _ = app.emit("esp32-connected", false);
}

#[tauri::command]
fn start_esp32(port: String, baud: u32, state: State<Arc<Esp32State>>, app: AppHandle) {
    // 前のスレッドを停止してから起動
    state.stop_flag.store(false, Ordering::Relaxed);
    let esp_state = Arc::clone(&state);
    thread::spawn(move || {
        match serialport::new(&port, baud)
            .timeout(Duration::from_millis(1000))
            .open()
        {
            Ok(mut serial) => {
                *esp_state.connected.lock().unwrap() = true;
                let _ = app.emit("esp32-connected", true);
                let mut buf = vec![0u8; 64];
                loop {
                    // stop_flag が立ったらポートを閉じて終了
                    if esp_state.stop_flag.load(Ordering::Relaxed) {
                        break;
                    }
                    match serial.read(&mut buf) {
                        Ok(n) if n > 0 => {
                            let line = String::from_utf8_lossy(&buf[..n]).trim().to_string();
                            if let Ok(count) = line.parse::<i32>() {
                                *esp_state.count.lock().unwrap() = count;
                                let _ = app.emit("esp32-count", count);
                            }
                        }
                        Err(e) if e.kind() == std::io::ErrorKind::TimedOut => {}
                        Err(_) => {
                            *esp_state.connected.lock().unwrap() = false;
                            let _ = app.emit("esp32-connected", false);
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(_) => {
                *esp_state.connected.lock().unwrap() = false;
                let _ = app.emit("esp32-connected", false);
            }
        }
    });
}

// ── arduino-cli 管理 ──────────────────────────────────────────────────────

fn arduino_cli_path() -> PathBuf {
    if which_arduino_cli().is_some() {
        return PathBuf::from("arduino-cli");
    }
    let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(base).join("arduino-cli").join("arduino-cli.exe")
}

fn which_arduino_cli() -> Option<PathBuf> {
    Command::new("arduino-cli")
        .arg("version")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|_| PathBuf::from("arduino-cli"))
}

#[tauri::command]
fn check_arduino_cli() -> bool {
    let path = arduino_cli_path();
    Command::new(&path)
        .arg("version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
fn setup_arduino_cli(app: AppHandle) {
    thread::spawn(move || {
        let emit = |msg: &str| { let _ = app.emit("arduino-progress", msg.to_string()); };
        let cli = arduino_cli_path();

        if !Command::new(&cli).arg("version").output().map(|o| o.status.success()).unwrap_or(false) {
            emit("arduino-cli をダウンロード中…");
            let url = "https://github.com/arduino/arduino-cli/releases/latest/download/arduino-cli_latest_Windows_64bit.zip";
            let zip_path = std::env::temp_dir().join("arduino-cli.zip");
            let install_dir = cli.parent().unwrap().to_path_buf();

            let dl = Command::new("powershell")
                .args(["-Command", &format!(
                    "Invoke-WebRequest -Uri '{}' -OutFile '{}'",
                    url, zip_path.display()
                )])
                .output();

            if dl.map(|o| !o.status.success()).unwrap_or(true) {
                emit("ERROR: ダウンロードに失敗しました。手動で arduino-cli をインストールしてください。");
                return;
            }

            emit("展開中…");
            std::fs::create_dir_all(&install_dir).ok();
            let _ = Command::new("powershell")
                .args(["-Command", &format!(
                    "Expand-Archive -Path '{}' -DestinationPath '{}' -Force",
                    zip_path.display(), install_dir.display()
                )])
                .output();
        }

        emit("ボードマネージャーを設定中…");
        let _ = Command::new(&cli)
            .args(["config", "add", "board_manager.additional_urls",
                   "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json"])
            .output();

        emit("パッケージインデックスを更新中…（1〜2分かかります）");
        let _ = Command::new(&cli).args(["core", "update-index"]).output();

        emit("ESP32 ボードパッケージをインストール中…（数分かかります）");
        let out = Command::new(&cli)
            .args(["core", "install", "esp32:esp32"])
            .output();

        match out {
            Ok(o) if o.status.success() => emit("DONE: セットアップ完了！"),
            _ => emit("ERROR: ESP32 パッケージのインストールに失敗しました。"),
        }
    });
}

/// ポートを切断 → スケッチ書き込み → 自動再接続
#[tauri::command]
fn flash_esp32(port: String, state: State<Arc<Esp32State>>, app: AppHandle) {
    // シリアルスレッドを停止してポートを解放
    state.stop_flag.store(true, Ordering::Relaxed);
    *state.connected.lock().unwrap() = false;
    let _ = app.emit("esp32-connected", false);

    let esp_state = Arc::clone(&state);
    thread::spawn(move || {
        let emit = |msg: &str| { let _ = app.emit("arduino-progress", msg.to_string()); };
        let cli = arduino_cli_path();

        // ポート解放を待つ
        thread::sleep(Duration::from_millis(800));

        let sketch_dir = std::env::temp_dir().join("58inomu_esp32");
        std::fs::create_dir_all(&sketch_dir).ok();
        let sketch_file = sketch_dir.join("58inomu_esp32.ino");
        if let Err(e) = std::fs::File::create(&sketch_file)
            .and_then(|mut f| f.write_all(SKETCH.as_bytes()))
        {
            emit(&format!("ERROR: スケッチの書き出しに失敗: {e}"));
            return;
        }

        emit("コンパイル中…");
        let compile = Command::new(&cli)
            .args(["compile", "--fqbn", "esp32:esp32:esp32",
                   sketch_dir.to_str().unwrap()])
            .output();

        match compile {
            Ok(o) if o.status.success() => {}
            Ok(o) => {
                emit(&format!("ERROR: コンパイル失敗\n{}", String::from_utf8_lossy(&o.stderr)));
                return;
            }
            Err(e) => { emit(&format!("ERROR: {e}")); return; }
        }

        emit(&format!("{} に書き込み中…", port));
        let upload = Command::new(&cli)
            .args(["upload", "--fqbn", "esp32:esp32:esp32",
                   "--port", &port,
                   sketch_dir.to_str().unwrap()])
            .output();

        match upload {
            Ok(o) if o.status.success() => {
                emit("DONE: 書き込み完了！自動的に再接続します…");
                // ESP32 リセット後の起動を待つ
                thread::sleep(Duration::from_millis(2000));
                // stop_flag をリセットして再接続
                esp_state.stop_flag.store(false, Ordering::Relaxed);
                let _ = app.emit("esp32-reconnect", port);
            }
            Ok(o) => emit(&format!("ERROR: 書き込み失敗\n{}", String::from_utf8_lossy(&o.stderr))),
            Err(e) => emit(&format!("ERROR: {e}")),
        }
    });
}

// ── アプリ起動 ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let esp32_state = Arc::new(Esp32State {
        count: Mutex::new(0),
        connected: Mutex::new(false),
        stop_flag: AtomicBool::new(false),
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(esp32_state)
        .invoke_handler(tauri::generate_handler![
            get_serial_ports,
            detect_esp32_port,
            get_esp32_count,
            get_esp32_connected,
            stop_esp32,
            start_esp32,
            check_arduino_cli,
            setup_arduino_cli,
            flash_esp32,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
