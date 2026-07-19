const fs = require('fs');
let code = fs.readFileSync('server/core/LearningManager.ts', 'utf8');
code = code.replace(
    'const customRequire = typeof require !== "undefined" ? require : createRequire(import.meta.url);',
    'const customRequire = typeof require !== "undefined" ? require : createRequire((import.meta as any).url || "file://");'
);
fs.writeFileSync('server/core/LearningManager.ts', code);
