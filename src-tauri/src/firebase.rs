use std::fs;
use std::path::PathBuf;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use url::Url;

use crate::sync::{TaskItem, TaskStoragePayload};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirebaseConfig {
    pub url: String,       // User-facing display URL, e.g. "https://my-db.firebaseio.com/tasks"
    pub rest_url: String,  // Normalized REST URL, e.g. "https://my-db.firebaseio.com/tasks.json"
}

fn get_firebase_config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|mut p| {
        p.push("tasksider");
        p.push("firebase.json");
        p
    })
}

pub fn load_firebase_config() -> Option<FirebaseConfig> {
    let path = get_firebase_config_path()?;
    if !path.exists() {
        return None;
    }
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

pub fn save_firebase_config(config: &FirebaseConfig) -> Result<(), String> {
    let path = get_firebase_config_path().ok_or_else(|| "Could not determine config directory".to_string())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_firebase_config() -> Result<(), String> {
    if let Some(path) = get_firebase_config_path() {
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Normalizes any user-entered Firebase RTDB URL into a clean display URL and a valid REST URL ending in `.json`.
/// Supports:
/// - https://<db>.firebaseio.com
/// - https://<db>.firebaseio.com/
/// - https://<db>.firebaseio.com/my-workspace
/// - https://<db>.firebaseio.com/my-workspace.json
/// - https://<db>.europe-west1.firebasedatabase.app/custom/path
/// - Optional ?auth=secret tokens
pub fn normalize_firebase_url(input: &str) -> Result<FirebaseConfig, String> {
    let mut trimmed = input.trim().to_string();
    if trimmed.is_empty() {
        return Err("Database URL cannot be empty".to_string());
    }

    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        trimmed = format!("https://{}", trimmed);
    }

    let parsed = Url::parse(&trimmed).map_err(|e| format!("Invalid URL: {}", e))?;
    let host = parsed.host_str().ok_or_else(|| "URL must include a host name".to_string())?;

    let path = parsed.path().trim_end_matches('/');
    let clean_path = if path.is_empty() || path == "/" {
        "/tasks".to_string()
    } else {
        path.to_string()
    };

    let (display_path, rest_path) = if clean_path.ends_with(".json") {
        let stripped = clean_path.trim_end_matches(".json").to_string();
        (if stripped.is_empty() { "/tasks".to_string() } else { stripped }, clean_path)
    } else {
        (clean_path.clone(), format!("{}.json", clean_path))
    };

    let query_suffix = match parsed.query() {
        Some(q) if !q.is_empty() => format!("?{}", q),
        _ => String::new(),
    };

    let scheme = parsed.scheme();
    let port_suffix = match parsed.port() {
        Some(p) => format!(":{}", p),
        None => String::new(),
    };

    let display_url = format!("{}://{}{}{}{}", scheme, host, port_suffix, display_path, query_suffix);
    let rest_url = format!("{}://{}{}{}{}", scheme, host, port_suffix, rest_path, query_suffix);

    Ok(FirebaseConfig {
        url: display_url,
        rest_url,
    })
}

/// Fetches tasks from Firebase Realtime Database.
/// Returns Ok(None) if the database node is empty (`null` or 404).
pub async fn fetch_remote_tasks(rest_url: &str) -> Result<Option<TaskStoragePayload>, String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(rest_url)
        .header("User-Agent", "Tasksider-Sync/0.1")
        .send()
        .await
        .map_err(|e| format!("Network error reaching Firebase: {}", e))?;

    let status = resp.status();
    if status == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }

    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err("Permission denied. Check your Firebase Realtime Database security rules (e.g. set \".read\": true, \".write\": true).".to_string());
    }

    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Firebase returned error (HTTP {}): {}", status, body));
    }

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let trimmed = text.trim();
    if trimmed.is_empty() || trimmed == "null" {
        return Ok(None);
    }

    // Try parsing as TaskStoragePayload first: { "tasks": [...], "lastModified": 123 }
    if let Ok(payload) = serde_json::from_str::<TaskStoragePayload>(trimmed) {
        return Ok(Some(payload));
    }

    // Fallback: try parsing directly as TaskItem array
    if let Ok(tasks) = serde_json::from_str::<Vec<TaskItem>>(trimmed) {
        return Ok(Some(TaskStoragePayload {
            tasks,
            last_modified: None,
        }));
    }

    // If it's valid JSON but unrecognized shape, return empty
    if serde_json::from_str::<serde_json::Value>(trimmed).is_ok() {
        return Ok(None);
    }

    Err("Invalid JSON received from Firebase".to_string())
}

/// Uploads tasks payload to Firebase Realtime Database via PUT.
pub async fn upload_remote_tasks(rest_url: &str, payload: &TaskStoragePayload) -> Result<(), String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .put(rest_url)
        .header("User-Agent", "Tasksider-Sync/0.1")
        .json(payload)
        .send()
        .await
        .map_err(|e| format!("Network error writing to Firebase: {}", e))?;

    let status = resp.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err("Permission denied. Check your Firebase Realtime Database security rules (e.g. set \".read\": true, \".write\": true).".to_string());
    }

    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Failed to save to Firebase (HTTP {}): {}", status, body));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_root_url() {
        let config = normalize_firebase_url("https://tasks-proj.firebaseio.com").unwrap();
        assert_eq!(config.url, "https://tasks-proj.firebaseio.com/tasks");
        assert_eq!(config.rest_url, "https://tasks-proj.firebaseio.com/tasks.json");
    }

    #[test]
    fn test_normalize_root_with_trailing_slash() {
        let config = normalize_firebase_url("https://tasks-proj.firebaseio.com/").unwrap();
        assert_eq!(config.url, "https://tasks-proj.firebaseio.com/tasks");
        assert_eq!(config.rest_url, "https://tasks-proj.firebaseio.com/tasks.json");
    }

    #[test]
    fn test_normalize_custom_path() {
        let config = normalize_firebase_url("https://tasks-proj.firebaseio.com/shared/work").unwrap();
        assert_eq!(config.url, "https://tasks-proj.firebaseio.com/shared/work");
        assert_eq!(config.rest_url, "https://tasks-proj.firebaseio.com/shared/work.json");
    }

    #[test]
    fn test_normalize_already_has_json() {
        let config = normalize_firebase_url("https://tasks-proj.firebaseio.com/shared/work.json").unwrap();
        assert_eq!(config.url, "https://tasks-proj.firebaseio.com/shared/work");
        assert_eq!(config.rest_url, "https://tasks-proj.firebaseio.com/shared/work.json");
    }

    #[test]
    fn test_normalize_without_scheme() {
        let config = normalize_firebase_url("tasks-proj.firebaseio.com/my-list").unwrap();
        assert_eq!(config.url, "https://tasks-proj.firebaseio.com/my-list");
        assert_eq!(config.rest_url, "https://tasks-proj.firebaseio.com/my-list.json");
    }

    #[test]
    fn test_normalize_with_auth_query() {
        let config = normalize_firebase_url("https://tasks-proj.firebaseio.com/tasks?auth=mysecret").unwrap();
        assert_eq!(config.url, "https://tasks-proj.firebaseio.com/tasks?auth=mysecret");
        assert_eq!(config.rest_url, "https://tasks-proj.firebaseio.com/tasks.json?auth=mysecret");
    }

    #[test]
    fn test_normalize_empty_fails() {
        assert!(normalize_firebase_url("   ").is_err());
    }
}
