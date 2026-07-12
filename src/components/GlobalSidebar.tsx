import React from "react";
import { Mic, MicOff, Brain, Activity, Cpu, HardDrive, Wifi, ShieldAlert, Layers, Network, Terminal as TerminalIcon } from "lucide-react";
import VoiceWaveform from "./VoiceWaveform";
import SystemMonitor from "./SystemMonitor";

interface GlobalSidebarProps {
  assistantState: "idle" | "listening" | "thinking" | "speaking" | "wake_listening";
  isListening: boolean;
  isWakeWordActive: boolean;
  selectedVoice: string;
  setSelectedVoice: (v: "bengali" | "english_female" | "english_male") => void;
  triggerWakeWord: () => void;
  interruptVoice: () => void;
  isTTSMuted: boolean;
  setIsTTSMuted: (v: boolean) => void;
}

export default function GlobalSidebar({
  assistantState,
  isListening,
  isWakeWordActive,
  selectedVoice,
  setSelectedVoice,
  triggerWakeWord,
  interruptVoice,
  isTTSMuted,
  setIsTTSMuted
}: GlobalSidebarProps) {
  return (
    <div className="w-80 h-full border-r border-cyan-500/20 bg-slate-900/60 backdrop-blur-md flex flex-col relative z-50 shrink-0 overflow-y-auto overflow-x-hidden scrollbar-none pb-12">
      {/* Brand & Status */}
      <div className="p-4 border-b border-cyan-500/10 flex items-center gap-3 sticky top-0 bg-slate-900/80 backdrop-blur-xl z-10">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-pink-500 p-[1.5px] shadow-[0_0_15px_rgba(0,242,254,0.4)] animate-pulse">
            <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-sans font-bold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400">
              RUVI OS
            </h1>
            <span className="text-[9px] font-mono border border-cyan-500/30 px-1 rounded bg-cyan-500/10 text-cyan-300">
              v4.0
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">
              Online / Syncing
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Holographic Face & Voice Engine */}
        <div className="bg-slate-950/50 border border-cyan-500/20 rounded-2xl p-4 shadow-[inset_0_0_20px_rgba(0,242,254,0.05)] relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute top-0 right-0 p-1.5 font-mono text-[8px] text-cyan-400/50 uppercase">
            Voice Matrix
          </div>
          
          <div className="relative w-32 h-32 rounded-full flex items-center justify-center border-2 border-dashed border-cyan-500/20 p-2 mb-2 group mt-2">
            <div className="absolute inset-0 rounded-full border border-pink-500/10 animate-spin" style={{ animationDuration: "20s" }} />
            <div className="absolute inset-3 rounded-full border border-cyan-500/20 animate-reverse-spin" style={{ animationDuration: "12s" }} />
            
            <div className={`w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-900/30 via-pink-950/20 to-slate-950/40 flex items-center justify-center overflow-hidden border border-cyan-400/20 relative shadow-[inset_0_0_20px_rgba(0,242,254,0.2)]`}>
              <div className={`absolute inset-4 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,242,254,0.4)_0%,transparent_60%)] filter blur-md animate-pulse`} />
              
              <div className="relative flex flex-col items-center">
                <Brain className={`w-8 h-8 ${
                  assistantState === "listening" ? "text-cyan-400 scale-110 drop-shadow-[0_0_10px_#00f2fe]" :
                  assistantState === "speaking" ? "text-pink-400 scale-115 drop-shadow-[0_0_12px_#ff0080]" :
                  assistantState === "thinking" ? "text-purple-400 animate-pulse" : "text-slate-400"
                } transition-all duration-300`} />
                <span className="text-[8px] font-mono mt-1 text-cyan-300 tracking-widest uppercase">
                  {assistantState}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full">
            <VoiceWaveform state={assistantState} />
          </div>

          <div className="flex gap-2 w-full mt-3">
            <button
              onClick={triggerWakeWord}
              className="flex-1 py-1.5 px-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-lg font-mono text-[10px] tracking-wider uppercase hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Mic className="w-3 h-3" /> Hey Ruvi
            </button>
            <button
              onClick={() => setIsTTSMuted(!isTTSMuted)}
              className={`p-1.5 rounded-lg border font-mono text-[10px] uppercase transition-all flex items-center gap-1 ${
                isTTSMuted ? "bg-pink-500/20 border-pink-500/40 text-pink-300" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {isTTSMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />} Mute
            </button>
          </div>
        </div>

        {/* Model Specs */}
        <div className="bg-slate-950/50 border border-purple-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-500/10">
            <Network className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-mono text-purple-300 uppercase">Core Model Routing</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">Current Node:</span>
              <span className="text-purple-300 font-bold bg-purple-500/10 px-1.5 rounded">Gemini-2.5-Pro</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">Context Window:</span>
              <span className="text-slate-300">2M Tokens</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">Active Tokens:</span>
              <span className="text-cyan-400">14,239</span>
            </div>
          </div>
        </div>

        {/* Real-time Hardware Specs (Reusing SystemMonitor) */}
        <SystemMonitor />

      </div>
    </div>
  );
}
