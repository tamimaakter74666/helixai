const fs = require('fs');
const file = 'src/components/WaveformVisualizer.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const normalizedVol = Math.min(1, Math.max(0, audioVolume * 5));',
  'const normalizedVol = Math.min(1, Math.max(0, audioVolume * 10));'
);

// also let's make it a bit taller max
code = code.replace(
  'barHeight = 4 + (normalizedVol * 40 * bell * pulse);',
  'barHeight = 4 + (normalizedVol * 50 * bell * pulse);'
);

fs.writeFileSync(file, code);
