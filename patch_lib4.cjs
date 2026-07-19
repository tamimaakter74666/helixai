const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

code = code.replace(
    /if let Ok\(mut child\) = Command::new\(server_path\)\.spawn\(\) \{[\s\S]*?\}\n                \}/,
    `let _ = Command::new(server_path).spawn();`
);
code = code.replace(
    /if let Ok\(mut child\) = Command::new\("npm"\)\.args\(\["run", "start"\]\)\.spawn\(\) \{[\s\S]*?\}\n                \}/,
    `let _ = Command::new("npm").args(["run", "start"]).spawn();`
);

fs.writeFileSync('src-tauri/src/lib.rs', code);
