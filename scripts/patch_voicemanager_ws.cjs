const fs = require('fs');
const file = 'src/voice-engine/VoiceManager.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'this.ws.send(JSON.stringify({ audio: base64 }));',
  `const state = this.stateMachine.getState();
        if (state !== "Idle" && state !== "WakeListening") {
          this.ws.send(JSON.stringify({ audio: base64 }));
        }`
);

fs.writeFileSync(file, code);
