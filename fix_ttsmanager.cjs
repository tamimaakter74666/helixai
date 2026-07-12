const fs = require('fs');
const file = 'src/voice-engine/core/TextToSpeechManager.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('setMuted')) {
  code = code.replace('stop() {', 'setMuted(muted: boolean) {\n    this.audioPlayer.setMuted(muted);\n  }\n  \n  stop() {');
  fs.writeFileSync(file, code);
}
