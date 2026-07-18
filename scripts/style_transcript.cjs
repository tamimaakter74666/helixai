const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// For the dashboard input:
const classStr1 = 'className="flex-1 bg-slate-900 border border-cyan-500/20 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner font-sans"';
const replaceStr1 = 'className={`flex-1 bg-slate-900 border focus:border-cyan-500/60 rounded-xl px-4 py-3 text-xs md:text-sm placeholder-slate-500 outline-none transition-all shadow-inner font-sans ${(!isFinal && voiceTranscript && !inputMessage) ? "border-cyan-400 text-cyan-300 italic" : "border-cyan-500/20 text-white"}`}';
code = code.replace(classStr1, replaceStr1);

// For the messenger input:
const classStr2 = 'className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm"';
const replaceStr2 = 'className={`flex-1 bg-transparent border-none outline-none text-sm ${(!isFinal && voiceTranscript && !inputMessage) ? "text-blue-500 italic" : "text-slate-800 dark:text-slate-100"}`}'
code = code.replace(classStr2, replaceStr2);

fs.writeFileSync(file, code);
