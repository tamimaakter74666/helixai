import React, { useState, useEffect } from "react";
 
 
 
import { GitMerge, BrainCircuit, ShieldAlert, Cpu, Server, Network, Workflow, Zap, Database, Lock, Search, PlayCircle } from "lucide-react";

export default function OrchestratorEngine() {
  const [tasks, setTasks] = useState([
    { id: "tk-1", name: "Semantic Search Analysis", status: "processing", agent: "Gemini-4.0", type: "memory" },
    { id: "tk-2", name: "Multi-person Pose Tracking", status: "parallel", agent: "Ollama-Vision", type: "vision" },
    { id: "tk-3", name: "Code Deployment (CI/CD)", status: "sandboxed", agent: "DeepSeek-R1", type: "developer" },
    { id: "tk-4", name: "Document OCR Extraction", status: "queued", agent: "Claude-3.5", type: "document" }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => {
        const statuses = ["processing", "parallel", "sandboxed", "queued", "completed"];
        return prev.map(t => {
          if (t.status === "completed") return t;
          if (Math.random() > 0.7) {
            const currentIdx = statuses.indexOf(t.status);
            return { ...t, status: statuses[Math.min(currentIdx + 1, statuses.length - 1)] };
          }
          return t;
        });
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Orchestrator Brain */}
        <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
          <div className="flex items-center justify-between mb-4 border-b border-indigo-500/10 pb-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              <h2 className="font-sans font-bold text-sm tracking-wider text-indigo-300 uppercase">AI Orchestrator Engine</h2>
            </div>
            <div className="flex items-center gap-2 bg-indigo-500/10 px-2 py-1 rounded text-[10px] font-mono text-indigo-300 border border-indigo-500/20">
              <Zap className="w-3 h-3 text-amber-400 animate-pulse" /> Auto-Routing Active
            </div>
          </div>

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
                  <span className={`w-1.5 h-1.5 rounded-full ${model.active ? (model.type === 'Local' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse') : 'bg-slate-700'}`} />
                </div>
                <span className={`text-[9px] mt-1 ${model.type === 'Local' ? 'text-amber-500/80' : 'text-emerald-500/80'}`}>{model.type}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4">
            <h3 className="text-xs font-mono text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2">
              <Workflow className="w-3.5 h-3.5 text-cyan-400" /> Live Task Decomposition
            </h3>
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    {task.status === "processing" ? <PlayCircle className="w-4 h-4 text-cyan-400 animate-pulse" /> :
                     task.status === "parallel" ? <Network className="w-4 h-4 text-purple-400 animate-pulse" /> :
                     task.status === "sandboxed" ? <Lock className="w-4 h-4 text-amber-400" /> :
                     task.status === "completed" ? <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center"><div className="w-2 h-2 bg-emerald-400 rounded-full" /></div> :
                     <div className="w-4 h-4 rounded-full border border-slate-600" />}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-200">{task.name}</span>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">{task.agent} • {task.type}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
                    {task.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security & Memory 2.0 */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
            <div className="flex items-center gap-2 mb-3 border-b border-emerald-500/10 pb-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h2 className="font-sans font-medium text-sm tracking-wider text-emerald-300 uppercase">Security Vault</h2>
            </div>
            <div className="space-y-2 text-[10px] font-mono">
              <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Sandboxed Execution</span>
                <span className="text-emerald-400">Enforced</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Secret Manager</span>
                <span className="text-emerald-400">Locked</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Memory Encryption</span>
                <span className="text-emerald-400">AES-256</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-5 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
            <div className="flex items-center gap-2 mb-3 border-b border-purple-500/10 pb-2">
              <Database className="w-4 h-4 text-purple-400" />
              <h2 className="font-sans font-medium text-sm tracking-wider text-purple-300 uppercase">Memory 2.0</h2>
            </div>
            <div className="space-y-2 text-[10px] font-mono text-slate-300">
              <div className="flex items-center gap-2"><Search className="w-3 h-3 text-purple-400" /> Semantic Vector Search</div>
              <div className="flex items-center gap-2"><Network className="w-3 h-3 text-purple-400" /> Knowledge Graph Link</div>
              <div className="flex items-center gap-2"><Zap className="w-3 h-3 text-purple-400" /> Episodic Timeline Sync</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
