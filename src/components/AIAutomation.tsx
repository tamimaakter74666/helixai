import React from 'react';
 
import { GitCommit, GitBranch, Play, CheckCircle2, Clock, Users } from 'lucide-react';

export default function AIAutomation() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900/60 backdrop-blur-md border border-orange-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(249,115,22,0.05)]">
        <div className="flex items-center gap-2 mb-4 border-b border-orange-500/10 pb-2">
          <GitBranch className="w-5 h-5 text-orange-400" />
          <h2 className="font-sans font-bold text-sm tracking-wider text-orange-300 uppercase">Visual Workflow Automation</h2>
        </div>
        
        <div className="relative pl-4 border-l border-slate-700 space-y-4">
           <div className="relative">
             <div className="absolute -left-5 bg-slate-950 rounded-full p-0.5 border border-slate-700">
               <Clock className="w-3 h-3 text-slate-400" />
             </div>
             <div className="bg-slate-950 p-2 rounded border border-slate-800">
               <span className="text-xs font-mono text-orange-300">Trigger: Email Received</span>
             </div>
           </div>
           <div className="relative">
             <div className="absolute -left-5 bg-slate-950 rounded-full p-0.5 border border-slate-700">
               <GitCommit className="w-3 h-3 text-cyan-400" />
             </div>
             <div className="bg-slate-950 p-2 rounded border border-slate-800">
               <span className="text-xs font-mono text-cyan-300">Action: Extract Invoice (OCR)</span>
             </div>
           </div>
           <div className="relative">
             <div className="absolute -left-5 bg-slate-950 rounded-full p-0.5 border border-slate-700">
               <CheckCircle2 className="w-3 h-3 text-emerald-400" />
             </div>
             <div className="bg-slate-950 p-2 rounded border border-slate-800">
               <span className="text-xs font-mono text-emerald-300">Action: Human Approval Checkpoint</span>
             </div>
           </div>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-md border border-sky-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(14,165,233,0.05)]">
        <div className="flex items-center gap-2 mb-4 border-b border-sky-500/10 pb-2">
          <Users className="w-5 h-5 text-sky-400" />
          <h2 className="font-sans font-bold text-sm tracking-wider text-sky-300 uppercase">Multi-Agent Collaboration</h2>
        </div>

        <div className="space-y-3">
           <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                 <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center border border-purple-500/50">
                    <span className="text-[10px] font-mono text-purple-300">R1</span>
                 </div>
                 <span className="text-xs font-mono text-slate-300">Code Analyst Agent</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">Active</span>
           </div>
           <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                 <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                    <span className="text-[10px] font-mono text-emerald-300">O1</span>
                 </div>
                 <span className="text-xs font-mono text-slate-300">Reviewer Agent</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">Active</span>
           </div>
           <div className="text-[10px] text-slate-500 font-mono mt-4 text-center border-t border-slate-800 pt-3">
              Agents share workspace and delegate tasks autonomously.
           </div>
        </div>
      </div>
    </div>
  );
}
