const fs = require('fs');
const file = 'src/components/WaveformVisualizer.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'state: "idle" | "listening" | "thinking" | "speaking",',
  'state: "idle" | "listening" | "thinking" | "speaking" | "wake_listening",'
);

code = code.replace(
  'if (state === "listening") {',
  'if (state === "listening" || state === "wake_listening") {'
);

code = code.replace(
  'state === "listening" ? "#10b981"',
  '(state === "listening" || state === "wake_listening") ? "#10b981"'
);

code = code.replace(
  '{state === "listening" && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}',
  '{(state === "listening" || state === "wake_listening") && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}'
);

code = code.replace(
  'state === "listening" ? "Audio Input Active"',
  'state === "listening" ? "Audio Input Active" : state === "wake_listening" ? "Waiting for \'Hey Ruvi\'"'
);

code = code.replace(
  '{state === "listening" && transcript && (',
  '{(state === "listening" || state === "wake_listening") && transcript && ('
);

fs.writeFileSync(file, code);
