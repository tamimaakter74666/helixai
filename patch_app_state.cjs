const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'voiceState === "WakeListening" ? "idle" :',
  'voiceState === "WakeListening" ? "listening" :'
);

fs.writeFileSync(file, code);
