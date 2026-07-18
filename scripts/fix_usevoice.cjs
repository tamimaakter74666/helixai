const fs = require('fs');
const file = 'src/voice-engine/useVoiceEngine.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const respond = useCallback\(\(text: string\) => \{[\s\S]*?\}, \[\]\);/,
  `const respond = useCallback((text: string) => {
     if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "bn-BD";
        window.speechSynthesis.speak(utterance);
     }
  }, []);`
);

fs.writeFileSync(file, code);
