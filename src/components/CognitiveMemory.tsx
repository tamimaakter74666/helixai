import React, { useEffect, useState } from 'react';
import { BrainCircuit, RefreshCw, Trash2, ShieldCheck, Check } from 'lucide-react';

interface MemoryItem {
  id: string;
  type: string;
  content: string;
  importance: number;
  timestamp: string;
}

export default function CognitiveMemory() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<number | null>(null);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/memories");
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memories/${id}`, { method: "DELETE" });
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const triggerExtraction = async () => {
    try {
      setExtracting(true);
      const res = await fetch("/api/memory/extract", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLastProcessed(data.processed);
        await fetchMemories();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'preference': return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
      case 'project': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'habit': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'tool': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-900/60 backdrop-blur-md border border-fuchsia-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(217,70,239,0.05)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-fuchsia-500/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-fuchsia-400" />
              <h2 className="font-sans font-bold text-sm tracking-wider text-fuchsia-300 uppercase">Long-Term Cognitive Memory</h2>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Ruvi extracts important user traits from conversations to build a personalized long-term profile.
            </p>
          </div>
          <button 
            onClick={triggerExtraction}
            disabled={extracting}
            className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/40 text-fuchsia-300 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            {extracting ? "Extracting..." : "Synthesize Memory"}
          </button>
        </div>

        {lastProcessed !== null && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-emerald-400 text-[11px] font-mono">
            <Check className="w-4 h-4" />
            Synthesized {lastProcessed} new memory points from recent chat history.
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-slate-400 font-mono text-xs">Loading memories...</div>
        ) : memories.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/50 rounded-xl border border-slate-800 border-dashed">
            <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-slate-400 text-xs font-mono">Memory is empty.</p>
            <p className="text-slate-500 text-[10px] font-mono mt-1">Start chatting with Ruvi to build preferences.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memories.map(memory => (
              <div key={memory.id} className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 relative group hover:border-slate-700 transition-colors">
                <button 
                  onClick={() => deleteMemory(memory.id)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Forget Memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <span className={"text-[9px] font-mono uppercase px-2 py-0.5 rounded border " + getTypeColor(memory.type)}>
                    {memory.type}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={"w-1.5 h-1.5 rounded-full " + (i < memory.importance ? 'bg-fuchsia-400 shadow-[0_0_5px_rgba(232,121,249,0.8)]' : 'bg-slate-800')} />
                    ))}
                  </div>
                </div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  {memory.content}
                </p>
                <div className="mt-3 text-[9px] text-slate-600 font-mono">
                  Synthesized: {new Date(memory.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
