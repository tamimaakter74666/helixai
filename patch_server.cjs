const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
    'import pkg from "wavefile";\nconst { WaveFile } = pkg;',
    'import * as wavefilepkg from "wavefile";\nconst WaveFile = (wavefilepkg as any).WaveFile || (wavefilepkg as any).default?.WaveFile;'
);
fs.writeFileSync('server.ts', code);
