const fs = require('fs');
let code = fs.readFileSync('src/voice-engine/core/AudioCapture.ts', 'utf8');

code = code.replace(
  'private processor: ScriptProcessorNode | null = null;',
  'private processor: ScriptProcessorNode | null = null;\n  private isMuted: boolean = false;'
);

code = code.replace(
  '      // Copy data to avoid mutation\n      this.emit("audio", new Float32Array(inputData));',
  '      // Copy data to avoid mutation\n      if (!this.isMuted) {\n        this.emit("audio", new Float32Array(inputData));\n      }'
);

code = code.replace(
  '  stop() {',
  '  setMuted(muted: boolean) {\n    this.isMuted = muted;\n  }\n\n  stop() {'
);

fs.writeFileSync('src/voice-engine/core/AudioCapture.ts', code);
console.log("Patched AudioCapture.ts");
