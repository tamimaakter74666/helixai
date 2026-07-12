const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// Find the line where useVoiceEngine is called
const useVoiceEngineLine = 'const { voiceState, transcript: voiceTranscript, isFinal, startListening, startWakeWordMode, stop: stopVoice, interrupt: interruptVoice, respond: voiceRespond, setLanguage: setVoiceLanguage, voiceManager } = useVoiceEngine(handleVoiceCommand);';

// Find the handleVoiceCommand definition
const handleVoiceCommandRegex = /const handleVoiceCommand = useCallback\(\(cmd: string, data\?: any\) => \{[\s\S]*?\}, \[\]\);/;

const match = code.match(handleVoiceCommandRegex);
if (match) {
  // Remove the old useVoiceEngine call
  code = code.replace(useVoiceEngineLine, '');
  // Insert it right after the match
  code = code.replace(match[0], match[0] + '\n  ' + useVoiceEngineLine + '\n');
}

fs.writeFileSync(file, code);
