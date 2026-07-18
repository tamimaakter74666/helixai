const fs = require('fs');
let code = fs.readFileSync('src/voice-engine/useVoiceEngine.ts', 'utf8');

const target = `      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name === 'AbortError') {
            return; // Interrupted by pause(), normal behavior
          }`;

const replacement = `      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name === 'AbortError' || String(err).includes('pause') || String(err).includes('interrupted')) {
            return; // Interrupted by pause(), normal behavior
          }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/voice-engine/useVoiceEngine.ts', code);
