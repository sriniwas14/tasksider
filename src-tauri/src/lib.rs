use std::fs;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{ShortcutState};

fn get_tasks_path() -> Option<PathBuf> {
    dirs::config_dir().map(|mut p| {
        p.push("tasksider");
        p.push("tasks.json");
        p
    })
}

fn get_legacy_taskside_path() -> Option<PathBuf> {
    dirs::config_dir().map(|mut p| {
        p.push("taskside");
        p.push("tasks.json");
        p
    })
}

#[tauri::command]
fn load_tasks() -> Result<String, String> {
    // 1. Try ~/.config/tasksider/tasks.json (or OS equivalent)
    if let Some(path) = get_tasks_path() {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                return Ok(content);
            }
        }
    }

    // 2. Fallback to existing ~/.config/taskside/tasks.json from the Quickshell app
    if let Some(legacy_path) = get_legacy_taskside_path() {
        if legacy_path.exists() {
            if let Ok(content) = fs::read_to_string(&legacy_path) {
                return Ok(content);
            }
        }
    }

    Ok("".to_string())
}

#[tauri::command]
fn save_tasks(data: String) -> Result<(), String> {
    let path = get_tasks_path().ok_or_else(|| "Could not determine config directory".to_string())?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn toggle_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut_builder = tauri_plugin_global_shortcut::Builder::new()
        .with_shortcuts(["Alt+Space", "CommandOrControl+Shift+T"])
        .unwrap()
        .with_handler(|app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                if let Some(w) = app.get_webview_window("main") {
                    let is_vis = w.is_visible().unwrap_or(false);
                    if is_vis {
                        let _ = w.hide();
                    } else {
                        let _ = w.show().and_then(|_| w.set_focus());
                    }
                }
            }
        });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(shortcut_builder.build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            load_tasks,
            save_tasks,
            toggle_window
        ])
        .setup(|app| {
            // Position the window docked to the right edge of the screen
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let screen_size = monitor.size();
                    let screen_pos = monitor.position();
                    let win_width = 380u32;
                    let win_height = screen_size.height;

                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width: win_width,
                        height: win_height,
                    }));
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: screen_pos.x + screen_size.width as i32 - win_width as i32,
                        y: screen_pos.y,
                    }));
                }
            }

            // Create System Tray
            let toggle_item = MenuItem::with_id(app, "toggle", "Toggle Tasksider", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Tasksider")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let is_vis = w.is_visible().unwrap_or(false);
                            if is_vis {
                                let _ = w.hide();
                            } else {
                                let _ = w.show().and_then(|_| w.set_focus());
                            }
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let is_vis = w.is_visible().unwrap_or(false);
                            if is_vis {
                                let _ = w.hide();
                            } else {
                                let _ = w.show().and_then(|_| w.set_focus());
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
