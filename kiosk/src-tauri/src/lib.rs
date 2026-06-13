use std::io::Write as IoWrite;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

// ESP32 を示す USB ベンダー文字列（CP210x / CH340 / FTDI）
const ESP32_KEYWORDS: &[&str] = &[
    "CP210", "CH340", "CH341", "FTDI", "USB Serial", "USB-SERIAL", "ESP32",
];

// 書き込むスケッチ（Wi-Fi プローブリクエストをカウントしてシリアル送信）
const SKETCH: &str = r#"
#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"

volatile int probe_count = 0;

void IRAM_ATTR sniffer_cb(void* buf, wifi_promiscuous_pkt_type_t type) {
  if (type == WIFI_PKT_MGMT) {
    wifi_promiscuous_pkt_t* pkt = (wifi_promiscuous_pkt_t*)buf;
    if ((pkt->payload[0] & 0xFC) == 0x40) {  // Probe Request
      probe_count++;
    }
  }
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
}

void loop() {
  Serial.println(probe_count);
  probe_count = 0;
  delay(1000);
}
"#;

// ── 状態 ──────────────────────────────────────────────────────────────────

struct Esp32State {
    count: Mutex<i32>,
    connected: Mutex<bool>,
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

/// ESP32 らしいポートを自動検知して返す
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
    // フォールバック: USB ポートが 1 つだけなら それを返す
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

#[tauri::command]
fn start_esp32(port: String, baud: u32, state: State<Arc<Esp32State>>, app: AppHandle) {
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
                    match serial.read(&mut buf) {
                        Ok(n) if n > 0 => {
                            let line = String::from_utf8_lossy(&buf[..n]).trim().to_string();
                            if let Ok(count) = line.parse::<i32>() {
                                *esp_state.count.lock().unwrap() = count;
                                let _ = app.emit("esp32-count", count);
                            }
                        }
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
    // PATH にあればそのまま使う
    if which_arduino_cli().is_some() {
        return PathBuf::from("arduino-cli");
    }
    // なければ %APPDATA%\arduino-cli\arduino-cli.exe に置く
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

/// arduino-cli がインストール済みか確認
#[tauri::command]
fn check_arduino_cli() -> bool {
    let path = arduino_cli_path();
    Command::new(&path)
        .arg("version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// arduino-cli のダウンロード + ESP32 ボードパッケージのセットアップ
/// 進捗は "arduino-progress" イベントで文字列を emit する
#[tauri::command]
fn setup_arduino_cli(app: AppHandle) {
    thread::spawn(move || {
        let emit = |msg: &str| { let _ = app.emit("arduino-progress", msg.to_string()); };

        let cli = arduino_cli_path();

        // ① arduino-cli 本体をダウンロード（未インストール時のみ）
        if !Command::new(&cli).arg("version").output().map(|o| o.status.success()).unwrap_or(false) {
            emit("arduino-cli をダウンロード中…");
            let url = "https://github.com/arduino/arduino-cli/releases/latest/download/arduino-cli_latest_Windows_64bit.zip";
            let zip_path = std::env::temp_dir().join("arduino-cli.zip");
            let install_dir = cli.parent().unwrap().to_path_buf();

            // PowerShell でダウンロード
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

            // 展開
            emit("展開中…");
            std::fs::create_dir_all(&install_dir).ok();
            let _ = Command::new("powershell")
                .args(["-Command", &format!(
                    "Expand-Archive -Path '{}' -DestinationPath '{}' -Force",
                    zip_path.display(), install_dir.display()
                )])
                .output();
        }

        // ② ボードマネージャーの URL を登録
        emit("ボードマネージャーを設定中…");
        let _ = Command::new(&cli)
            .args(["config", "add", "board_manager.additional_urls",
                   "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json"])
            .output();

        // ③ インデックス更新
        emit("パッケージインデックスを更新中…（1〜2分かかります）");
        let _ = Command::new(&cli).args(["core", "update-index"]).output();

        // ④ ESP32 コアをインストール
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

/// スケッチをコンパイルして ESP32 に書き込む
#[tauri::command]
fn flash_esp32(port: String, app: AppHandle) {
    thread::spawn(move || {
        let emit = |msg: &str| { let _ = app.emit("arduino-progress", msg.to_string()); };
        let cli = arduino_cli_path();

        // スケッチを一時ディレクトリに書き出す
        let sketch_dir = std::env::temp_dir().join("58inomu_esp32");
        std::fs::create_dir_all(&sketch_dir).ok();
        let sketch_file = sketch_dir.join("58inomu_esp32.ino");
        if let Err(e) = std::fs::File::create(&sketch_file)
            .and_then(|mut f| f.write_all(SKETCH.as_bytes()))
        {
            emit(&format!("ERROR: スケッチの書き出しに失敗: {e}"));
            return;
        }

        // コンパイル
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

        // 書き込み
        emit(&format!("{} に書き込み中…", port));
        let upload = Command::new(&cli)
            .args(["upload", "--fqbn", "esp32:esp32:esp32",
                   "--port", &port,
                   sketch_dir.to_str().unwrap()])
            .output();

        match upload {
            Ok(o) if o.status.success() => emit("DONE: 書き込み完了！"),
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
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(esp32_state)
        .invoke_handler(tauri::generate_handler![
            get_serial_ports,
            detect_esp32_port,
            get_esp32_count,
            get_esp32_connected,
            start_esp32,
            check_arduino_cli,
            setup_arduino_cli,
            flash_esp32,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
