const fs = require('fs');
const file = 'src/voice-engine/VoiceManager.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/this\.audioCapture\.start\(stream\);/g, 'this.audioCapture.start(stream);\n      this.speechRecognizer.start();');
code = code.replace(/this\.audioCapture\.stop\(\);/g, 'this.audioCapture.stop();\n    this.speechRecognizer.stop();');

fs.writeFileSync(file, code);
