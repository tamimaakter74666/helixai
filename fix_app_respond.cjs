const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/voiceManager\.respond\(/g, 'voiceRespond(');
fs.writeFileSync(file, code);
