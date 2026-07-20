const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');
code = code.replace(
    '.map_err(|e| e.to_string())?;',
    '.map_err(|e| format!("{:?}", e))?;'
);
fs.writeFileSync('src-tauri/src/lib.rs', code);
