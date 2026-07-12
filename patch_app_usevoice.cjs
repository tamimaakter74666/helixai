const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'setLanguage: setVoiceLanguage, voiceManager } = useVoiceEngine(handleVoiceCommand);',
  'setLanguage: setVoiceLanguage, voiceManager, audioVolume } = useVoiceEngine(handleVoiceCommand);'
);

fs.writeFileSync(file, code);
