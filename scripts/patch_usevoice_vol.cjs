const fs = require('fs');
const file = 'src/voice-engine/useVoiceEngine.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('const [audioVolume,')) {
  code = code.replace(
    'const [isFinal, setIsFinal] = useState(true);',
    'const [isFinal, setIsFinal] = useState(true);\n  const [audioVolume, setAudioVolume] = useState(0);'
  );
  
  code = code.replace(
    'voiceManager.on("command", handleCommand);',
    'voiceManager.on("command", handleCommand);\n    const handleVolume = (vol: number) => setAudioVolume(vol);\n    voiceManager.on("audioVolume", handleVolume);'
  );
  
  code = code.replace(
    'voiceManager.off("command", handleCommand);',
    'voiceManager.off("command", handleCommand);\n      voiceManager.off("audioVolume", handleVolume);'
  );
  
  code = code.replace(
    'voiceManager\n  };',
    'voiceManager,\n    audioVolume\n  };'
  );
  
  fs.writeFileSync(file, code);
}
