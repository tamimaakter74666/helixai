const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
    'import { createRequire } from "module";\nconst require = createRequire(import.meta.url);\nconst wavefile = require("wavefile");\nconst WaveFile = wavefile.WaveFile;',
    'import wavefile from "wavefile";\nconst WaveFile = wavefile.WaveFile;'
);
fs.writeFileSync('server.ts', code);
