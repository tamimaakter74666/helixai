const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const badgeReplacement = `
                      {m.role === "assistant" && m.routingInfo && (
                        <div className="flex items-center gap-2">
                           <span className={\`text-[8px] font-mono px-1 rounded \${m.routingInfo.selectedAI?.toLowerCase().includes('ollama') ? 'bg-amber-500/10 text-amber-300' : 'bg-cyan-500/10 text-cyan-300'}\`}>
                             {m.routingInfo.selectedAI}
                           </span>
                           {m.routingInfo.latency && (
                             <span className="text-[8px] font-mono text-slate-500 flex items-center gap-0.5">
                               {m.routingInfo.latency}ms
                             </span>
                           )}
                        </div>
                      )}
`;

code = code.replace(/\{m\.role === "assistant" && m\.routingInfo && \([\s\S]*?\}\)/, badgeReplacement.trim());

fs.writeFileSync('src/App.tsx', code);
