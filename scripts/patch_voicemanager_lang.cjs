const fs = require('fs');
const file = 'src/voice-engine/VoiceManager.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('setLanguage(lang')) {
  code = code.replace('stop() {', 'setLanguage(lang: string) {\n    let code = "bn-BD";\n    if (lang.includes("english")) code = "en-US";\n    this.speechRecognizer.setLanguage(code);\n  }\n\n  stop() {');
  fs.writeFileSync(file, code);
}

const file2 = 'src/voice-engine/useVoiceEngine.ts';
let code2 = fs.readFileSync(file2, 'utf8');
code2 = code2.replace(/const setLanguage = useCallback\(\(lang: string\) => \{[\s\S]*?\}, \[\]\);/, 'const setLanguage = useCallback((lang: string) => {\n     voiceManager.setLanguage(lang);\n  }, []);');
fs.writeFileSync(file2, code2);
