use std::fs;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg(target_os = "linux")]
use gtk::prelude::*;
#[cfg(target_os = "linux")]
use gtk_layer_shell::LayerShell;

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

fn position_sidebar(window: &tauri::WebviewWindow) {
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

pub fn toggle_sidebar(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
        } else {
            #[cfg(not(target_os = "linux"))]
            position_sidebar(&window);

            #[cfg(target_os = "linux")]
            {
                if !gtk_layer_shell::is_supported() {
                    position_sidebar(&window);
                } else if let Ok(gtk_window) = window.gtk_window() {
                    gtk_window.show_all();
                }
            }

            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
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
    toggle_sidebar(&app);
    Ok(())
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    Ok(())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut_builder = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                let app_handle = app.clone();
                let _ = app.run_on_main_thread(move || {
                    toggle_sidebar(&app_handle);
                });
            }
        });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(shortcut_builder.build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let app_handle = app.clone();
            let _ = app.run_on_main_thread(move || {
                if args.iter().any(|a| a == "--hide" || a == "hide") {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                } else if args.iter().any(|a| a == "--show" || a == "show") {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        #[cfg(not(target_os = "linux"))]
                        position_sidebar(&window);

                        #[cfg(target_os = "linux")]
                        {
                            if !gtk_layer_shell::is_supported() {
                                position_sidebar(&window);
                            }
                        }

                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                } else {
                    toggle_sidebar(&app_handle);
                }
            });
        }))
        // Intercept close event: hide window instead of exiting process
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            load_tasks,
            save_tasks,
            toggle_window,
            hide_window,
            quit_app
        ])
        .setup(|app| {
            // macOS Accessory policy: acts as menu bar / tray utility without polluting the Dock
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Position and setup window
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "linux")]
                {
                    if gtk_layer_shell::is_supported() {
                        if let Ok(gtk_window) = window.gtk_window() {
                            gtk_window.init_layer_shell();
                            gtk_window.set_namespace("tasksider");
                            gtk_window.set_layer(gtk_layer_shell::Layer::Top);
                            gtk_window.set_anchor(gtk_layer_shell::Edge::Right, true);
                            gtk_window.set_anchor(gtk_layer_shell::Edge::Top, true);
                            gtk_window.set_anchor(gtk_layer_shell::Edge::Bottom, true);
                            gtk_window.set_exclusive_zone(0);
                            gtk_window.set_keyboard_mode(gtk_layer_shell::KeyboardMode::OnDemand);
                            gtk_window.set_size_request(380, -1);
                        }
                    } else {
                        position_sidebar(&window);
                    }
                }

                #[cfg(not(target_os = "linux"))]
                {
                    position_sidebar(&window);
                }

                let start_hidden = std::env::args().any(|a| a == "--hide" || a == "--hidden");
                if !start_hidden {
                    #[cfg(target_os = "linux")]
                    {
                        if let Ok(gtk_window) = window.gtk_window() {
                            gtk_window.show_all();
                        }
                    }
                    let _ = window.show();
                }
            }

            // Register global shortcuts gracefully
            let global_shortcut = app.global_shortcut();
            let candidate_shortcuts = ["Alt+Space", "CommandOrControl+Shift+T", "CommandOrControl+Alt+T"];
            for raw_sc in candidate_shortcuts {
                if let Ok(sc) = raw_sc.parse::<Shortcut>() {
                    let _ = global_shortcut.register(sc);
                }
            }

            // Create System Tray with icon and menu
            let toggle_item = MenuItem::with_id(app, "toggle", "Toggle Tasksider", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Tasksider", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Tasksider (Click or shortcut to toggle)")
                .show_menu_on_left_click(false);

            // Ensure tray has an icon
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => {
                        let app_handle = app.clone();
                        let _ = app.run_on_main_thread(move || {
                            toggle_sidebar(&app_handle);
                        });
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
                        let app_handle = tray.app_handle().clone();
                        let _ = app_handle.clone().run_on_main_thread(move || {
                            toggle_sidebar(&app_handle);
                        });
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
