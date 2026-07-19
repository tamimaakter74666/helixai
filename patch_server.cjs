const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
    'import * as wavefilepkg from "wavefile";\nconst WaveFile = (wavefilepkg as any).WaveFile || (wavefilepkg as any).default?.WaveFile;',
    'import { createRequire } from "module";\nconst require = createRequire(import.meta.url);\nconst wavefile = require("wavefile");\nconst WaveFile = wavefile.WaveFile;'
);
fs.writeFileSync('server.ts', code);
