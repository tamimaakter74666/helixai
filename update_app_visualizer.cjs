const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldRender = 'const renderFaceWaveform = () => <WaveformVisualizer state={assistantState} />;'
const newRender = 'const renderFaceWaveform = () => <WaveformVisualizer state={assistantState} audioVolume={audioVolume} transcript={voiceTranscript} />;'

code = code.replace(oldRender, newRender);

fs.writeFileSync(file, code);
