const fs = require('fs');
const file = 'src/voice-engine/VoiceManager.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('this.emit("audioVolume"')) {
  code = code.replace(
    'this.vad.process(pcmData);',
    `this.vad.process(pcmData);
      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < pcmData.length; i++) {
        sum += pcmData[i] * pcmData[i];
      }
      const rms = Math.sqrt(sum / pcmData.length);
      this.emit("audioVolume", rms);`
  );
  fs.writeFileSync(file, code);
}
