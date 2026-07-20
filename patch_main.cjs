const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');
code = code.replace(
    'const customUrl = localStorage.getItem("ruvi_server_url");',
    'let customUrl = localStorage.getItem("ruvi_server_url");\n    if (customUrl) customUrl = customUrl.replace("localhost", "127.0.0.1");'
);
fs.writeFileSync('src/main.tsx', code);
