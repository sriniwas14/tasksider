use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};

pub const DRIVE_FILES_URL: &str = "https://www.googleapis.com/drive/v3/files";
pub const DRIVE_UPLOAD_URL: &str = "https://www.googleapis.com/upload/drive/v3/files";

#[derive(Debug, Deserialize)]
struct FileListResponse {
    files: Vec<DriveFileMeta>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DriveFileMeta {
    pub id: String,
    pub name: Option<String>,
    #[serde(rename = "modifiedTime")]
    pub modified_time: Option<String>,
}

/// Searches the private appDataFolder for an existing `tasks.json` file.
pub async fn find_tasks_file(access_token: &str) -> Result<Option<String>, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}?spaces=appDataFolder&q=name='tasks.json' and trashed=false&fields=files(id,name,modifiedTime)",
        DRIVE_FILES_URL
    );

    let res = client
        .get(&url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Drive file search request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Failed to search appDataFolder: {}", err_text));
    }

    let file_list: FileListResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse Drive file list: {}", e))?;

    Ok(file_list.files.into_iter().next().map(|f| f.id))
}

/// Downloads the `tasks.json` content from Google Drive by file ID.
pub async fn download_tasks_file(access_token: &str, file_id: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/{}?alt=media", DRIVE_FILES_URL, file_id);

    let res = client
        .get(&url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Drive download request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Failed to download tasks.json from Drive: {}", err_text));
    }

    res.text()
        .await
        .map_err(|e| format!("Failed to read downloaded content: {}", e))
}

/// Uploads a new `tasks.json` file into the private `appDataFolder`.
pub async fn upload_new_tasks_file(access_token: &str, content: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}?uploadType=multipart", DRIVE_UPLOAD_URL);

    let metadata_json = r#"{"name":"tasks.json","parents":["appDataFolder"]}"#;

    let form = Form::new()
        .part(
            "metadata",
            Part::text(metadata_json)
                .mime_str("application/json; charset=UTF-8")
                .map_err(|e| e.to_string())?,
        )
        .part(
            "file",
            Part::text(content.to_string())
                .mime_str("application/json")
                .map_err(|e| e.to_string())?,
        );

    let res = client
        .post(&url)
        .bearer_auth(access_token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Drive multipart upload failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Failed to upload new tasks to Drive: {}", err_text));
    }

    let created: DriveFileMeta = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse created file metadata: {}", e))?;

    Ok(created.id)
}

/// Updates an existing `tasks.json` in Google Drive with fresh content.
pub async fn update_tasks_file(access_token: &str, file_id: &str, content: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/{}?uploadType=media", DRIVE_UPLOAD_URL, file_id);

    let res = client
        .patch(&url)
        .bearer_auth(access_token)
        .header("Content-Type", "application/json")
        .body(content.to_string())
        .send()
        .await
        .map_err(|e| format!("Drive patch request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Failed to update tasks on Drive: {}", err_text));
    }

    Ok(())
}
