import React from 'react';
import { DatabaseZap, FileText, Search, Library, Tags, Folders } from 'lucide-react';

export default function KnowledgeSystem() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900/60 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
        <div className="flex items-center gap-2 mb-4 border-b border-indigo-500/10 pb-2">
          <DatabaseZap className="w-5 h-5 text-indigo-400" />
          <h2 className="font-sans font-bold text-sm tracking-wider text-indigo-300 uppercase">Knowledge System (RAG)</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
           <div className="bg-slate-950/60 p-2 rounded-lg border border-indigo-500/20 flex items-center gap-2">
             <Library className="w-4 h-4 text-indigo-400" />
             <span className="text-[10px] font-mono text-slate-300">Local RAG</span>
           </div>
           <div className="bg-slate-950/60 p-2 rounded-lg border border-indigo-500/20 flex items-center gap-2">
             <Search className="w-4 h-4 text-sky-400" />
             <span className="text-[10px] font-mono text-slate-300">Web RAG</span>
           </div>
           <div className="bg-slate-950/60 p-2 rounded-lg border border-indigo-500/20 flex items-center gap-2">
             <FileText className="w-4 h-4 text-rose-400" />
             <span className="text-[10px] font-mono text-slate-300">PDF RAG</span>
           </div>
           <div className="bg-slate-950/60 p-2 rounded-lg border border-indigo-500/20 flex items-center gap-2">
             <DatabaseZap className="w-4 h-4 text-emerald-400" />
             <span className="text-[10px] font-mono text-slate-300">GitHub RAG</span>
           </div>
        </div>

        <div className="text-[10px] font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400 space-y-1">
          <p>• Hybrid search engine enabled.</p>
          <p>• Citation engine tracking active sources.</p>
          <p>• Knowledge graph linkage stable.</p>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
        <div className="flex items-center gap-2 mb-4 border-b border-emerald-500/10 pb-2">
          <Folders className="w-5 h-5 text-emerald-400" />
          <h2 className="font-sans font-bold text-sm tracking-wider text-emerald-300 uppercase">File Intelligence</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500" /> Semantic File Search
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ready</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <Tags className="w-3.5 h-3.5 text-slate-500" /> Auto Tagging
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
            <span className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Document Summarization
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
