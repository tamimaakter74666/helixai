import React from "react";
import { Activity, Users, Map, Video, Zap, Eye, Smartphone, Cloud, LayoutGrid } from "lucide-react";

export default function RuViewAnalytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Deep Vision & Tracking */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-pink-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(236,72,153,0.05)]">
        <div className="flex items-center gap-2 mb-4 border-b border-pink-500/10 pb-2">
          <Eye className="w-5 h-5 text-pink-400" />
          <h2 className="font-sans font-bold text-sm tracking-wider text-pink-300 uppercase">RuView Deep Vision</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-pink-500/20 flex flex-col gap-1">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Multi-Person Track</span>
            <span className="text-lg font-bold text-white">4 Active</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-pink-500/20 flex flex-col gap-1">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Skeleton/Pose</span>
            <span className="text-lg font-bold text-white">Mapped</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-pink-500/20 flex flex-col gap-1">
            <Map className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Heatmap Density</span>
            <span className="text-lg font-bold text-white">Live</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-pink-500/20 flex flex-col gap-1">
            <Video className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Fall/Intrusion</span>
            <span className="text-lg font-bold text-emerald-400">Secure</span>
          </div>
        </div>
        
        <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(236,72,153,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(236,72,153,0.1)_1px,transparent_1px)] bg-[size:10px_10px]" />
          <span className="font-mono text-[10px] text-pink-400/50 uppercase z-10 animate-pulse">Edge AI Camera Feed Synthesizing...</span>
        </div>
      </div>

      {/* Cloud & Device Ecosystem */}
      <div className="space-y-6">
        <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(0,242,254,0.05)]">
          <div className="flex items-center gap-2 mb-3 border-b border-cyan-500/10 pb-2">
            <LayoutGrid className="w-5 h-5 text-cyan-400" />
            <h2 className="font-sans font-bold text-sm tracking-wider text-cyan-300 uppercase">Companion Ecosystem</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                Mobile App Sync (iOS/Android)
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">Paired</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                <Cloud className="w-4 h-4 text-cyan-400" />
                Cloud Memory Sync & Backup
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">Synced</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                <Zap className="w-4 h-4 text-cyan-400" />
                Gaming Macro & Overlay
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">Standby</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
