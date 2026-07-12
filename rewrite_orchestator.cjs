const fs = require('fs');

let code = fs.readFileSync('src/components/OrchestratorEngine.tsx', 'utf8');

const modelStatusReplacement = `
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { name: "Gemini", type: "Cloud", active: true },
              { name: "Claude", type: "Cloud", active: true },
              { name: "DeepSeek", type: "Cloud", active: true },
              { name: "Ollama", type: "Local", active: true },
              { name: "OpenAI", type: "Cloud", active: true },
              { name: "Mistral", type: "Local", active: false },
              { name: "Qwen", type: "Local", active: false }
            ].map(model => (
              <div key={model.name} className="flex flex-col justify-center bg-slate-950/50 p-2 rounded border border-slate-800 font-mono relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-xs">{model.name}</span>
                  <span className={\`w-1.5 h-1.5 rounded-full \${model.active ? (model.type === 'Local' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse') : 'bg-slate-700'}\`} />
                </div>
                <span className={\`text-[9px] mt-1 \${model.type === 'Local' ? 'text-amber-500/80' : 'text-emerald-500/80'}\`}>{model.type}</span>
              </div>
            ))}
          </div>
`;

code = code.replace(/<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">[\s\S]*?<\/div>/, modelStatusReplacement.trim());

fs.writeFileSync('src/components/OrchestratorEngine.tsx', code);
