const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldClass1 = 'className={`flex-1 bg-slate-900 border focus:border-cyan-500/60 rounded-xl px-4 py-3 text-xs md:text-sm placeholder-slate-500 outline-none transition-all shadow-inner font-sans ${(!isFinal && voiceTranscript && !inputMessage) ? "border-cyan-400 text-cyan-300 italic" : "border-cyan-500/20 text-white"}`}';
const newClass1 = 'className={`flex-1 bg-slate-900 border focus:border-cyan-500/60 rounded-xl px-4 py-3 text-xs md:text-sm placeholder-slate-500 outline-none transition-all shadow-inner font-sans ${(!isFinal && inputMessage) ? "border-cyan-400 text-cyan-300 italic" : "border-cyan-500/20 text-white"}`}';
code = code.replace(oldClass1, newClass1);

const oldClass2 = 'className={`flex-1 bg-transparent border-none outline-none text-sm ${(!isFinal && voiceTranscript && !inputMessage) ? "text-blue-500 italic" : "text-slate-800 dark:text-slate-100"}`}';
const newClass2 = 'className={`flex-1 bg-transparent border-none outline-none text-sm ${(!isFinal && inputMessage) ? "text-blue-500 italic" : "text-slate-800 dark:text-slate-100"}`}';
code = code.replace(oldClass2, newClass2);

fs.writeFileSync(file, code);
