const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldMic = '{/* Voice/Mic button */}';
const newMic = '{/* Voice/Mic button */}\n                <div className="absolute -top-6 left-0 right-0 text-center text-[10px] text-slate-500 font-mono">If voice fails, open in New Tab ↗</div>';

code = code.replace(oldMic, newMic);

fs.writeFileSync(file, code);
