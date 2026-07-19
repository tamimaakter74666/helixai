const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

code = code.replace(
    /let _ = Command::new\(server_path\)\.spawn\(\);/,
    `if let Ok(mut child) = Command::new(server_path).spawn() {
                    app.handle().on_window_event(move |window, event| {
                        if let tauri::WindowEvent::Destroyed = event {
                            if window.label() == "main" {
                                let _ = child.kill();
                            }
                        }
                    });
                }`
);
code = code.replace(
    /let _ = Command::new\("npm"\)\.args\(\["run", "start"\]\)\.spawn\(\);/,
    `if let Ok(mut child) = Command::new("npm").args(["run", "start"]).spawn() {
                    app.handle().on_window_event(move |window, event| {
                        if let tauri::WindowEvent::Destroyed = event {
                            if window.label() == "main" {
                                let _ = child.kill();
                            }
                        }
                    });
                }`
);

fs.writeFileSync('src-tauri/src/lib.rs', code);
