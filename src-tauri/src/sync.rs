use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::auth::{get_valid_access_token, load_auth_record, save_auth_record};
use crate::drive::{download_tasks_file, find_tasks_file, update_tasks_file, upload_new_tasks_file};

static IS_SYNCING: AtomicBool = AtomicBool::new(false);
static LAST_SYNCED: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskItem {
    pub id: String,
    pub title: String,
    pub done: bool,
    pub priority: i32,
    pub expanded: bool,
    pub archived: bool,
    pub children: Vec<TaskItem>,
    #[serde(default, rename = "updatedAt")]
    pub updated_at: Option<u64>,
    #[serde(default)]
    pub deleted: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStoragePayload {
    #[serde(default)]
    pub tasks: Vec<TaskItem>,
    #[serde(default, rename = "lastModified")]
    pub last_modified: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub connected: bool,
    pub email: Option<String>,
    #[serde(rename = "lastSynced")]
    pub last_synced: Option<u64>,
    pub syncing: bool,
    pub error: Option<String>,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn get_tasks_path() -> Option<PathBuf> {
    dirs::config_dir().map(|mut p| {
        p.push("tasksider");
        p.push("tasks.json");
        p
    })
}

fn get_backup_path() -> Option<PathBuf> {
    dirs::config_dir().map(|mut p| {
        p.push("tasksider");
        p.push("tasks.backup.json");
        p
    })
}

pub fn get_current_sync_status() -> SyncStatus {
    let auth = load_auth_record();
    let connected = auth.is_some();
    let email = auth.and_then(|a| a.email);
    let last = LAST_SYNCED.load(Ordering::SeqCst);

    SyncStatus {
        connected,
        email,
        last_synced: if last > 0 { Some(last) } else { None },
        syncing: IS_SYNCING.load(Ordering::SeqCst),
        error: None,
    }
}

/// Merges two task lists recursively by task ID and updated_at timestamp.
pub fn merge_task_lists(local: Vec<TaskItem>, remote: Vec<TaskItem>) -> Vec<TaskItem> {
    let mut remote_map: HashMap<String, TaskItem> = remote
        .into_iter()
        .map(|item| (item.id.clone(), item))
        .collect();

    let mut merged = Vec::new();

    // Process all local items
    for local_item in local {
        if let Some(remote_item) = remote_map.remove(&local_item.id) {
            // Task exists in both: pick newer or merge children
            let local_time = local_item.updated_at.unwrap_or(0);
            let remote_time = remote_item.updated_at.unwrap_or(0);

            let (winner, other) = if local_time >= remote_time {
                (local_item, remote_item)
            } else {
                (remote_item, local_item)
            };

            let merged_children = merge_task_lists(winner.children, other.children);

            // If marked deleted in either, propagate deletion
            let is_deleted = winner.deleted.unwrap_or(false) || other.deleted.unwrap_or(false);

            if !is_deleted {
                merged.push(TaskItem {
                    id: winner.id,
                    title: winner.title,
                    done: winner.done,
                    priority: winner.priority,
                    expanded: winner.expanded,
                    archived: winner.archived,
                    children: merged_children,
                    updated_at: Some(std::cmp::max(local_time, remote_time)),
                    deleted: None,
                });
            }
        } else {
            // Only exists locally
            if !local_item.deleted.unwrap_or(false) {
                merged.push(local_item);
            }
        }
    }

    // Process remaining remote items that were not present locally
    for (_, remote_item) in remote_map {
        if !remote_item.deleted.unwrap_or(false) {
            merged.push(remote_item);
        }
    }

    merged
}

/// Executes a two-way sync cycle:
/// 1. Verifies/refreshes Google access token.
/// 2. Reads local tasks.
/// 3. Finds or downloads remote tasks from Google Drive appDataFolder.
/// 4. Merges trees, creates local backup, writes local tasks, and updates Drive.
/// Returns the updated merged JSON string for the frontend.
pub async fn execute_sync() -> Result<Option<String>, String> {
    if IS_SYNCING.swap(true, Ordering::SeqCst) {
        return Err("A sync is already in progress".to_string());
    }

    let result = execute_sync_internal().await;
    IS_SYNCING.store(false, Ordering::SeqCst);

    if result.is_ok() {
        LAST_SYNCED.store(now_ms(), Ordering::SeqCst);
    }

    result
}

async fn execute_sync_internal() -> Result<Option<String>, String> {
    let access_token = get_valid_access_token().await?;
    let mut auth = load_auth_record().ok_or_else(|| "Not signed in".to_string())?;

    let tasks_path = get_tasks_path().ok_or_else(|| "Could not locate config directory".to_string())?;

    // Load local tasks
    let local_raw = if tasks_path.exists() {
        fs::read_to_string(&tasks_path).unwrap_or_default()
    } else {
        String::new()
    };

    let local_payload: TaskStoragePayload = serde_json::from_str(&local_raw).unwrap_or(TaskStoragePayload {
        tasks: Vec::new(),
        last_modified: None,
    });

    // Locate remote tasks file in appDataFolder
    let file_id = match auth.drive_file_id.as_ref() {
        Some(id) => Some(id.clone()),
        None => {
            let found = find_tasks_file(&access_token).await?;
            if let Some(ref fid) = found {
                auth.drive_file_id = Some(fid.clone());
                let _ = save_auth_record(&auth);
            }
            found
        }
    };

    let (merged_tasks, new_file_id) = match file_id {
        Some(fid) => {
            // Remote file exists: download & merge
            let remote_raw = download_tasks_file(&access_token, &fid).await?;
            let remote_payload: TaskStoragePayload = serde_json::from_str(&remote_raw).unwrap_or(TaskStoragePayload {
                tasks: Vec::new(),
                last_modified: None,
            });

            let merged = merge_task_lists(local_payload.tasks, remote_payload.tasks);
            let merged_payload = TaskStoragePayload {
                tasks: merged.clone(),
                last_modified: Some(now_ms()),
            };

            let merged_raw = serde_json::to_string_pretty(&merged_payload).map_err(|e| e.to_string())?;

            // Push merged back to Drive
            update_tasks_file(&access_token, &fid, &merged_raw).await?;
            (merged, fid)
        }
        None => {
            // First-time sync: upload local tasks to Drive
            let payload = TaskStoragePayload {
                tasks: local_payload.tasks.clone(),
                last_modified: Some(now_ms()),
            };
            let content = serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?;
            let created_id = upload_new_tasks_file(&access_token, &content).await?;

            auth.drive_file_id = Some(created_id.clone());
            let _ = save_auth_record(&auth);

            (local_payload.tasks, created_id)
        }
    };

    let final_payload = TaskStoragePayload {
        tasks: merged_tasks,
        last_modified: Some(now_ms()),
    };
    let final_json = serde_json::to_string_pretty(&final_payload).map_err(|e| e.to_string())?;

    // Save safety backup of previous local tasks before overwriting
    if let Some(backup_path) = get_backup_path() {
        if !local_raw.is_empty() {
            let _ = fs::write(backup_path, &local_raw);
        }
    }

    // Save merged result to local tasks.json
    fs::write(&tasks_path, &final_json).map_err(|e| e.to_string())?;

    // Update cached drive file id if needed
    if auth.drive_file_id.as_deref() != Some(&new_file_id) {
        auth.drive_file_id = Some(new_file_id);
        let _ = save_auth_record(&auth);
    }

    Ok(Some(final_json))
}
