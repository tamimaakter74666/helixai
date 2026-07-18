const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// First input in dashboard
code = code.replace(
  'value={inputMessage}',
  'value={inputMessage || (!isFinal && voiceTranscript ? voiceTranscript : "")}'
);

// Second input in messenger
// Wait, it will replace both since there's multiple `value={inputMessage}`. Let's do global replace.
code = code.replace(
  /value=\{inputMessage\}/g,
  'value={inputMessage || (!isFinal && voiceTranscript ? voiceTranscript : "")}'
);

fs.writeFileSync(file, code);
