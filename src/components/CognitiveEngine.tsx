import React from 'react';
import { Brain, Heart, Activity, LineChart, Network, UserCircle, Fingerprint, Lightbulb } from 'lucide-react';

export default function CognitiveEngine() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cognitive AI */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-fuchsia-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(217,70,239,0.05)]">
        <div className="flex items-center gap-2 mb-4 border-b border-fuchsia-500/10 pb-2">
          <Brain className="w-5 h-5 text-fuchsia-400" />
          <h2 className="font-sans font-bold text-sm tracking-wider text-fuchsia-300 uppercase">Cognitive AI & Learning</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-fuchsia-500/20 flex flex-col gap-1">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Emotional Intel</span>
            <span className="text-sm font-bold text-white">Adaptive</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-fuchsia-500/20 flex flex-col gap-1">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Predictive</span>
            <span className="text-sm font-bold text-white">Suggestions</span>
          </div>
        </div>
        <div className="space-y-2">
           <div className="flex justify-between text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800">
             <span className="text-slate-400">Confidence Score</span>
             <span className="text-emerald-400">98.5%</span>
           </div>
           <div className="flex justify-between text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800">
             <span className="text-slate-400">Self-Evaluation</span>
             <span className="text-cyan-400">Continuous</span>
           </div>
           <div className="flex justify-between text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800">
             <span className="text-slate-400">Habit Learning</span>
             <span className="text-purple-400">Active</span>
           </div>
        </div>
      </div>

      {/* Digital Twin & Personal */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(0,242,254,0.05)]">
        <div className="flex items-center gap-2 mb-4 border-b border-cyan-500/10 pb-2">
          <UserCircle className="w-5 h-5 text-cyan-400" />
          <h2 className="font-sans font-bold text-sm tracking-wider text-cyan-300 uppercase">Digital Twin & Context</h2>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-slate-300 uppercase">User Profile Graph</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-cyan-400 w-[85%]"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-400" />
               <span className="text-[10px] font-mono text-slate-400">Health Sync</span>
             </div>
             <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex items-center gap-2">
               <LineChart className="w-4 h-4 text-amber-400" />
               <span className="text-[10px] font-mono text-slate-400">Finance Log</span>
             </div>
             <div className="bg-slate-950/60 p-2 rounded border border-slate-800 flex items-center gap-2">
               <Fingerprint className="w-4 h-4 text-pink-400" />
               <span className="text-[10px] font-mono text-slate-400">Pref Evolution</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
