use std::collections::HashMap;

#[derive(serde::Deserialize)]
struct FetchOptions {
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

#[derive(serde::Serialize)]
struct FetchResponse {
    status: u16,
    status_text: String,
    body: String,
}

#[tauri::command]
async fn fetch_native_http(url: String, options: Option<FetchOptions>) -> Result<FetchResponse, String> {
    // Force IPv4 loopback if URL uses localhost to avoid Windows IPv6 (::1) Node.js binding issues
    let mut resolved_url = url.clone();
    if resolved_url.starts_with("http://localhost:") {
        resolved_url = resolved_url.replacen("localhost", "127.0.0.1", 1);
    }
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .no_proxy() // Avoid any system proxy for native fetch
        .build()
        .map_err(|e| format!("Reqwest Client Error: {}", e))?;

    let method_str = options.as_ref()
        .and_then(|o| o.method.as_ref())
        .map(|m| m.to_uppercase())
        .unwrap_or_else(|| "GET".to_string());

    let method = match method_str.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        "OPTIONS" => reqwest::Method::OPTIONS,
        "HEAD" => reqwest::Method::HEAD,
        _ => reqwest::Method::GET,
    };

    let mut req_builder = client.request(method, &resolved_url);

    if let Some(opts) = &options {
        if let Some(headers) = &opts.headers {
            for (k, v) in headers {
                req_builder = req_builder.header(k, v);
            }
        }
        if let Some(body) = &opts.body {
            req_builder = req_builder.body(body.clone());
        }
    }

    let res = req_builder.send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status().as_u16();
    let status_text = res.status().canonical_reason().unwrap_or("").to_string();

    let body = res.text()
        .await
        .map_err(|e| e.to_string())?;

    Ok(FetchResponse {
        status,
        status_text,
        body,
    })
}

#[tauri::command]
async fn fetch_local_http(url: String) -> Result<String, String> {
    let mut resolved_url = url.clone();
    if resolved_url.starts_with("http://localhost:") {
        resolved_url = resolved_url.replacen("localhost", "127.0.0.1", 1);
    }
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .no_proxy()
        .build()
        .map_err(|e| format!("Reqwest Client Error: {}", e))?;

    let res = client.get(&resolved_url)
        .send()
        .await
        .map_err(|e| format!("Reqwest Send Error: {}", e))?;

    let text = res.text()
        .await
        .map_err(|e| format!("Reqwest Body Error: {}", e))?;

    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                use tauri::Manager;
                use std::process::Command;
                let resource_dir = app.path().resource_dir().unwrap_or_default();
                
                let binary_name = if cfg!(windows) { "ruvi-server.exe" } else { "ruvi-server" };
                let server_path = resource_dir.join("backend-dist").join(binary_name);
                
                let _ = Command::new(server_path).spawn();
            }
            #[cfg(debug_assertions)]
            {
                use std::process::Command;
                let _ = Command::new("npm").args(["run", "start"]).spawn();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![fetch_local_http, fetch_native_http])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
