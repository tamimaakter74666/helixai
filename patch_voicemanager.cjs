const fs = require('fs');
let code = fs.readFileSync('src/voice-engine/VoiceManager.ts', 'utf8');

const target = `    this.stateMachine.on("stateChange", (state) => {
      this.emit("stateChange", state);
    });`;

const replacement = `    this.stateMachine.on("stateChange", (state) => {
      if (state === "Speaking") {
         this.audioCapture.setMuted(true);
         this.speechRecognizer.stop();
      } else {
         this.audioCapture.setMuted(false);
         // Resume speech recognizer if not idle
         if (state !== "Idle" && state !== "Sleeping") {
             this.speechRecognizer.start();
         }
      }
      this.emit("stateChange", state);
    });`;

code = code.replace(target, replacement);
fs.writeFileSync('src/voice-engine/VoiceManager.ts', code);
console.log("Patched VoiceManager.ts stateChange");
