import React from "react";
import { Hammer, Sparkles, Terminal } from "lucide-react";

export default function ComingSoonOSPanel({ title, description }: { title: string, description?: string }) {
  return (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
      <div className="relative group mb-6">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl group-hover:bg-cyan-400/30 transition-all duration-500 animate-pulse" />
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-cyan-500/40 flex items-center justify-center relative bg-slate-950/50 backdrop-blur-sm group-hover:scale-105 transition-transform duration-500">
          <Hammer className="w-10 h-10 text-cyan-400 animate-bounce" style={{ animationDuration: '2s' }} />
          <Sparkles className="w-4 h-4 text-pink-400 absolute top-2 right-2 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>
      
      <h2 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300 font-sans mb-3 uppercase">
        {title}
      </h2>
      
      <p className="text-slate-400 font-mono text-sm max-w-md mx-auto mb-8 border border-slate-800 bg-slate-950/50 p-4 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        {description || "This module is currently being compiled by the core orchestrator. Check back after the next synchronization cycle."}
      </p>

      <div className="flex gap-4 opacity-50">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Terminal className="w-3 h-3" />
          <span>STATUS: ALLOCATING_RESOURCES</span>
        </div>
      </div>
    </div>
  );
}
