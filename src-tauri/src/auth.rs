use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

// Default Tasksider Desktop OAuth Client ID (can be overridden by user in settings)
pub const DEFAULT_CLIENT_ID: &str = "1048590137452-8703k5sk2i8j9t6pfa6kuh73q1p8c7f0.apps.googleusercontent.com";
pub const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
pub const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
pub const GOOGLE_USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";
pub const SCOPES: &str = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthRecord {
    pub client_id: String,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: u64, // Unix timestamp in seconds
    pub email: Option<String>,
    pub drive_file_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
    token_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UserInfoResponse {
    email: Option<String>,
}

pub fn get_auth_path() -> Option<PathBuf> {
    dirs::config_dir().map(|mut p| {
        p.push("tasksider");
        p.push("auth.json");
        p
    })
}

pub fn load_auth_record() -> Option<AuthRecord> {
    let path = get_auth_path()?;
    if !path.exists() {
        return None;
    }
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

pub fn save_auth_record(record: &AuthRecord) -> Result<(), String> {
    let path = get_auth_path().ok_or_else(|| "Could not locate config directory".to_string())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(record).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
    }

    Ok(())
}

pub fn delete_auth_record() -> Result<(), String> {
    if let Some(path) = get_auth_path() {
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Generates a cryptographic random PKCE code verifier and SHA256 challenge (RFC 7636)
pub fn generate_pkce() -> (String, String) {
    let mut rng = rand::thread_rng();
    let chars: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let verifier: String = (0..64)
        .map(|_| {
            let idx = rng.gen_range(0..chars.len());
            chars[idx] as char
        })
        .collect();

    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    let challenge = URL_SAFE_NO_PAD.encode(hash);

    (verifier, challenge)
}

/// Starts an ephemeral local HTTP listener, opens the browser, waits for the redirect code,
/// and exchanges it for Google OAuth tokens.
pub async fn start_oauth_flow(custom_client_id: Option<String>) -> Result<AuthRecord, String> {
    let client_id = custom_client_id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_CLIENT_ID.to_string());

    let (code_verifier, code_challenge) = generate_pkce();

    // Bind to 127.0.0.1 on OS-assigned free port (port 0)
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind local loopback listener: {}", e))?;
    let local_port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{}", local_port);

    // Build authorization URL
    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
        GOOGLE_AUTH_URL,
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(SCOPES),
        urlencoding::encode(&code_challenge)
    );

    // Open system browser with authorization URL
    open::that(&auth_url).map_err(|e| format!("Failed to open system browser: {}", e))?;

    // Wait for the single incoming HTTP GET redirect from Google
    let (mut stream, _) = listener
        .accept()
        .map_err(|e| format!("Failed to accept incoming OAuth redirect: {}", e))?;

    let mut buffer = [0u8; 4096];
    let bytes_read = stream
        .read(&mut buffer)
        .map_err(|e| format!("Failed to read HTTP request: {}", e))?;
    let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);

    // Parse auth code from: GET /?code=4/0A... HTTP/1.1
    let auth_code = extract_query_param(&request_str, "code")
        .ok_or_else(|| {
            if let Some(err) = extract_query_param(&request_str, "error") {
                format!("Google OAuth authorization was denied or failed: {}", err)
            } else {
                "No authorization code received in redirect".to_string()
            }
        })?;

    // Respond with a clean, branded browser page
    let html_body = r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tasksider Authentication</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #14141c; color: #e6e9f5; display: flex; align-items: center; justify-content: center; height: 90vh; margin: 0; }
        .card { text-align: center; padding: 40px 32px; background: #26263a; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 420px; }
        h2 { color: #89b4fa; margin-top: 0; font-size: 20px; }
        p { color: #8a8fa8; font-size: 14px; line-height: 1.5; margin-bottom: 0; }
        .success-icon { width: 48px; height: 48px; background: rgba(137, 180, 250, 0.15); color: #89b4fa; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="success-icon">&#10003;</div>
        <h2>Connected to Google Drive</h2>
        <p>Tasksider has authenticated successfully.<br>You can safely close this tab and return to the sidebar.</p>
    </div>
</body>
</html>"#;

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html_body.len(),
        html_body
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();

    // Exchange authorization code for access & refresh tokens
    let http_client = reqwest::Client::new();
    let token_params = [
        ("client_id", client_id.as_str()),
        ("code", auth_code.as_str()),
        ("code_verifier", code_verifier.as_str()),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect_uri.as_str()),
    ];

    let token_res = http_client
        .post(GOOGLE_TOKEN_URL)
        .form(&token_params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    if !token_res.status().is_success() {
        let err_text = token_res.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", err_text));
    }

    let token_data: TokenResponse = token_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let expires_at = now_secs() + token_data.expires_in;

    // Fetch user profile email
    let email = fetch_user_email(&http_client, &token_data.access_token).await.ok();

    let record = AuthRecord {
        client_id,
        access_token: token_data.access_token,
        refresh_token: token_data.refresh_token,
        expires_at,
        email,
        drive_file_id: None,
    };

    save_auth_record(&record)?;
    Ok(record)
}

/// Refreshes the access token using the stored refresh token if expired or near expiry
pub async fn get_valid_access_token() -> Result<String, String> {
    let mut record = load_auth_record().ok_or_else(|| "Not signed in to Google".to_string())?;

    // If token is valid for at least 90 more seconds, return it
    if record.expires_at > now_secs() + 90 {
        return Ok(record.access_token);
    }

    let refresh_token = record
        .refresh_token
        .as_ref()
        .ok_or_else(|| "No refresh token available. Please sign in again.".to_string())?;

    let http_client = reqwest::Client::new();
    let refresh_params = [
        ("client_id", record.client_id.as_str()),
        ("refresh_token", refresh_token.as_str()),
        ("grant_type", "refresh_token"),
    ];

    let res = http_client
        .post(GOOGLE_TOKEN_URL)
        .form(&refresh_params)
        .send()
        .await
        .map_err(|e| format!("Token refresh request failed: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {}", err_text));
    }

    let refreshed: TokenResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse refresh response: {}", e))?;

    record.access_token = refreshed.access_token.clone();
    record.expires_at = now_secs() + refreshed.expires_in;
    if let Some(new_rt) = refreshed.refresh_token {
        record.refresh_token = Some(new_rt);
    }

    save_auth_record(&record)?;
    Ok(refreshed.access_token)
}

async fn fetch_user_email(client: &reqwest::Client, access_token: &str) -> Result<String, String> {
    let res = client
        .get(GOOGLE_USERINFO_URL)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let info: UserInfoResponse = res.json().await.map_err(|e| e.to_string())?;
        if let Some(em) = info.email {
            return Ok(em);
        }
    }
    Err("Could not retrieve email".to_string())
}

fn extract_query_param(request: &str, param: &str) -> Option<String> {
    let first_line = request.lines().next()?;
    let path = first_line.split_whitespace().nth(1)?;
    let query_string = path.split('?').nth(1)?;

    for pair in query_string.split('&') {
        let mut parts = pair.split('=');
        if let (Some(k), Some(v)) = (parts.next(), parts.next()) {
            if k == param {
                return urlencoding::decode(v).ok().map(|c| c.into_owned());
            }
        }
    }
    None
}
