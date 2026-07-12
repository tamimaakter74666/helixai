const fs = require('fs');
const file = 'src/voice-engine/core/SpeechRecognizer.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'processLiveMessage(msg: any) {',
  `processLiveMessage(msg: any) {
    if (msg.clientContent?.turns) {
       for (const turn of msg.clientContent.turns) {
          if (turn.parts) {
             for (const part of turn.parts) {
                if (part.text) {
                   this.emit("transcript", part.text, true);
                }
             }
          }
       }
    }
    
    // Sometimes it's inside serverContent as a transcription
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
         // output audio transcription
      }
    }
    
    // Check for any other structure
    if (msg.type === "live_message") {
       // just in case
    }`
);

fs.writeFileSync(file, code);
