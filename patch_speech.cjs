const fs = require('fs');
const file = 'src/voice-engine/core/SpeechRecognizer.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'this.recognition.onresult = (event: any) => {',
  'this.recognition.onresult = (event: any) => {\n        console.log("Speech recognition onresult", event);'
);

fs.writeFileSync(file, code);
