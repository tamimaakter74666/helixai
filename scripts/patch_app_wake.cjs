const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'voiceState === "WakeListening" ? "listening" :',
  'voiceState === "WakeListening" ? "wake_listening" :'
);

fs.writeFileSync(file, code);
