const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

const setupStart = code.indexOf('.setup(|app| {');
const setupEnd = code.indexOf('Ok(())', setupStart);

const newSetup = `.setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                use tauri::Manager;
                use std::process::Command;
                let resource_dir = app.path().resource_dir().unwrap_or_default();
                
                let binary_name = if cfg!(windows) { "ruvi-server.exe" } else { "ruvi-server" };
                let server_path = resource_dir.join("backend-dist").join(binary_name);
                
                let mut child = Command::new(server_path).spawn().expect("failed to spawn backend");
                app.on_window_event(move |window, event| {
                    if let tauri::WindowEvent::Destroyed = event {
                        if window.label() == "main" {
                            let _ = child.kill();
                        }
                    }
                });
            }
            #[cfg(debug_assertions)]
            {
                use std::process::Command;
                let mut child = Command::new("npm").args(["run", "start"]).spawn().expect("failed to start dev server");
                app.on_window_event(move |window, event| {
                    if let tauri::WindowEvent::Destroyed = event {
                        if window.label() == "main" {
                            let _ = child.kill();
                        }
                    }
                });
            }
            `;

code = code.substring(0, setupStart) + newSetup + code.substring(setupEnd);
fs.writeFileSync('src-tauri/src/lib.rs', code);
