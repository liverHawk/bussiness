use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

struct Esp32State {
    count: Mutex<i32>,
    connected: Mutex<bool>,
}

#[tauri::command]
fn get_serial_ports() -> Vec<String> {
    serialport::available_ports()
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.port_name)
        .collect()
}

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
                            let line = String::from_utf8_lossy(&buf[..n])
                                .trim()
                                .to_string();
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
            get_esp32_count,
            get_esp32_connected,
            start_esp32,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
