const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// Ensure that transcript doesn't stay stuck forever, clear it when state goes back to idle or thinking
const clearTranscriptEffect = `
  useEffect(() => {
    if (voiceState !== "Listening" && voiceState !== "UserSpeaking") {
      // Clear transcript if we stopped listening
      // Well, wait, if we setInputMessage(text), it handles the text. We can just leave it as is.
    }
  }, [voiceState]);
`;

