use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::firebase::{fetch_remote_tasks, load_firebase_config, upload_remote_tasks};

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
    #[serde(default, rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(default, rename = "duration")]
    pub duration: Option<u32>,
    #[serde(default, rename = "timeSpent")]
    pub time_spent: Option<u64>,
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
    #[serde(rename = "databaseUrl")]
    pub database_url: Option<String>,
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

pub fn reset_last_synced() {
    LAST_SYNCED.store(0, Ordering::SeqCst);
}

pub fn get_current_sync_status() -> SyncStatus {
    let config = load_firebase_config();
    let connected = config.is_some();
    let database_url = config.map(|c| c.url);
    let last = LAST_SYNCED.load(Ordering::SeqCst);

    SyncStatus {
        connected,
        database_url,
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
                    due_date: winner.due_date,
                    duration: winner.duration,
                    time_spent: winner.time_spent,
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
/// 1. Reads local tasks.
/// 2. Fetches remote tasks from Firebase Realtime Database.
/// 3. Merges trees, creates local backup, writes local tasks, and updates Firebase.
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
    let config = load_firebase_config().ok_or_else(|| "Firebase database URL is not configured".to_string())?;

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

    // Fetch remote tasks from Firebase RTDB
    let remote_option = fetch_remote_tasks(&config.rest_url).await?;

    let merged_tasks = match remote_option {
        Some(remote_payload) => {
            // Remote file exists: merge
            let merged = merge_task_lists(local_payload.tasks, remote_payload.tasks);
            let merged_payload = TaskStoragePayload {
                tasks: merged.clone(),
                last_modified: Some(now_ms()),
            };

            // Push merged state back to Firebase
            upload_remote_tasks(&config.rest_url, &merged_payload).await?;
            merged
        }
        None => {
            // First-time sync: upload local tasks to Firebase
            let payload = TaskStoragePayload {
                tasks: local_payload.tasks.clone(),
                last_modified: Some(now_ms()),
            };
            upload_remote_tasks(&config.rest_url, &payload).await?;
            local_payload.tasks
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
    if let Some(parent) = tasks_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&tasks_path, &final_json).map_err(|e| e.to_string())?;

    Ok(Some(final_json))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_task(id: &str, title: &str, done: bool, updated_at: u64) -> TaskItem {
        TaskItem {
            id: id.to_string(),
            title: title.to_string(),
            done,
            priority: 2,
            expanded: true,
            archived: false,
            children: vec![],
            updated_at: Some(updated_at),
            deleted: None,
            due_date: Some("2026-11-17".to_string()),
            duration: Some(60),
            time_spent: Some(120),
        }
    }

    #[test]
    fn test_merge_newer_remote_wins() {
        let local = vec![create_test_task("t1", "Old Title", false, 100)];
        let remote = vec![create_test_task("t1", "New Title from Collaborator", true, 200)];

        let merged = merge_task_lists(local, remote);
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].title, "New Title from Collaborator");
        assert_eq!(merged[0].done, true);
        assert_eq!(merged[0].updated_at, Some(200));
        assert_eq!(merged[0].due_date, Some("2026-11-17".to_string()));
    }

    #[test]
    fn test_merge_newer_local_wins() {
        let local = vec![create_test_task("t1", "My Fresh Update", true, 300)];
        let remote = vec![create_test_task("t1", "Old Collaborator Update", false, 200)];

        let merged = merge_task_lists(local, remote);
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].title, "My Fresh Update");
        assert_eq!(merged[0].done, true);
        assert_eq!(merged[0].updated_at, Some(300));
    }

    #[test]
    fn test_merge_combines_disjoint_tasks() {
        let local = vec![create_test_task("t1", "Task from Person A", false, 100)];
        let remote = vec![create_test_task("t2", "Task from Person B", false, 150)];

        let merged = merge_task_lists(local, remote);
        assert_eq!(merged.len(), 2);
        let ids: Vec<String> = merged.into_iter().map(|t| t.id).collect();
        assert!(ids.contains(&"t1".to_string()));
        assert!(ids.contains(&"t2".to_string()));
    }

    #[test]
    fn test_merge_deletes_when_marked_deleted() {
        let mut local_item = create_test_task("t1", "Task to Delete", false, 100);
        local_item.deleted = Some(true);
        let local = vec![local_item];
        let remote = vec![create_test_task("t1", "Task to Delete", false, 50)];

        let merged = merge_task_lists(local, remote);
        assert_eq!(merged.len(), 0);
    }
}
