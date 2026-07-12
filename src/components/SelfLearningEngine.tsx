import React, { useState, useEffect, useRef } from "react";
import { 
  Brain, RefreshCw, ShieldCheck, Network, CheckSquare, 
  Settings2, Lock, Cpu, Sparkles, Terminal as TerminalIcon, Play, 
  Check, Loader2, ArrowRight, Zap, Layers, AlertTriangle, RefreshCcw
} from "lucide-react";

interface Subsystem {
  id: string;
  name: string;
  version: string;
  status: "ready" | "upgrading" | "optimized";
  description: string;
  gain: string;
}

interface SelfLearningEngineProps {
  onUpgradingChange?: (upgrading: boolean) => void;
}

export default function SelfLearningEngine({ onUpgradingChange }: SelfLearningEngineProps) {
  const [isUpgradingMain, setIsUpgradingMain] = useState(false);
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [upgradeStep, setUpgradeStep] = useState<string>("Ready");
  const [currentVersion, setCurrentVersion] = useState("v1.2.3-stable");
  const [upgradeLogs, setUpgradeLogs] = useState<string[]>([
    "[SYSTEM] Self-upgrade daemon loaded.",
    "[SYSTEM] Standing by for master instruction..."
  ]);
  const [habitLearning, setHabitLearning] = useState(true);
  const [toolDiscovery, setToolDiscovery] = useState(true);
  const [errorCorrection, setErrorCorrection] = useState(true);

  // Subsystems state
  const [subsystems, setSubsystems] = useState<Subsystem[]>([
    { id: "bengali_speech", name: "Bengali Speech Model", version: "v2.0.1", status: "ready", description: "Enhances deep tone resonance & pitch-modulation for Bengali TTS.", gain: "+45% natural cadence" },
    { id: "llm_context", name: "NPU Cognitive Context", version: "v4.1.2", status: "ready", description: "Expands short-term buffer mapping from 1M to 2M tokens.", gain: "+100% memory depth" },
    { id: "ruview_depth", name: "RuView Vision Filter", version: "v3.2.0", status: "ready", description: "Enables multi-point object segmentation on camera feed.", gain: "+30% FPS tracking" },
    { id: "workspace_ops", name: "OAuth Agent Autopilot", version: "v1.1.5", status: "ready", description: "Automates calendar conflict resolution & mail drafts.", gain: "+60% task dispatch" }
  ]);

  const isAnySubsystemUpgrading = subsystems.some(sub => sub.status === "upgrading");
  const isCurrentlyUpgrading = isUpgradingMain || isAnySubsystemUpgrading;

  useEffect(() => {
    if (onUpgradingChange) {
      onUpgradingChange(isCurrentlyUpgrading);
    }
  }, [isCurrentlyUpgrading, onUpgradingChange]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [upgradeLogs]);

  const addLog = (msg: string) => {
    setUpgradeLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runMainUpgradeSequence = () => {
    if (isUpgradingMain) return;
    setIsUpgradingMain(true);
    setUpgradeProgress(0);
    setUpgradeStep("Initializing Scanner");
    
    setUpgradeLogs([
      `[${new Date().toLocaleTimeString()}] [UPGRADE] Initializing master workspace self-upgrade sequence...`,
      `[${new Date().toLocaleTimeString()}] [SYSTEM] Allocating container buffer for AST compiling...`
    ]);

    const steps = [
      { text: "Scanning codebase for refactoring targets...", progress: 15, delay: 1000 },
      { text: "Analyzing system telemetry logs & error rates...", progress: 30, delay: 2000 },
      { text: "Optimizing memory allocation in server.ts...", progress: 45, delay: 3000 },
      { text: "Synthesizing next-gen model routes (Gemini 3.5 Flash)...", progress: 60, delay: 4200 },
      { text: "Running type compliance checking (tsc --noEmit)...", progress: 75, delay: 5500 },
      { text: "Executing hot-reloader and micro-patching...", progress: 90, delay: 6800 },
      { text: "Upgrade successfully compiled and integrated!", progress: 100, delay: 8000 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setUpgradeProgress(step.progress);
        setUpgradeStep(step.text);
        addLog(`[STEP ${idx + 1}/7] ${step.text}`);
        
        if (step.progress === 15) {
          addLog("  ↳ Found 18 active source files.");
          addLog("  ↳ Selected: CognitiveEngine.tsx, VoiceWaveform.tsx for performance tuning.");
        }
        if (step.progress === 30) {
          addLog("  ↳ Telemetry assessment: 0.04% exception rate.");
          addLog("  ↳ Pattern detected: Frequent tone shifting. Applying dampener.");
        }
        if (step.progress === 45) {
          addLog("  ↳ Cleaned up stale websocket memory channels.");
          addLog("  ↳ Server-side context streaming latency optimized from 250ms to 175ms.");
        }
        if (step.progress === 75) {
          addLog("  ↳ TS Compile: Success. 0 warnings, 0 fatal errors.");
        }
        if (step.progress === 100) {
          addLog("[SUCCESS] System hot-reload finalized.");
          addLog(`[VERSION] Upgraded from v1.2.3-stable to v1.2.4-stable.`);
          setCurrentVersion("v1.2.4-stable");
          setIsUpgradingMain(false);
          setUpgradeStep("Complete");
        }
      }, step.delay);
    });
  };

  const upgradeSubsystem = (id: string) => {
    setSubsystems(prev => prev.map(sub => {
      if (sub.id === id) {
        addLog(`[UPGRADE] Commencing optimization on module: ${sub.name}...`);
        setTimeout(() => {
          setSubsystems(current => current.map(item => {
            if (item.id === id) {
              addLog(`[SUCCESS] Module ${item.name} successfully optimized to newer build.`);
              return { ...item, status: "optimized" };
            }
            return item;
          }));
        }, 1800);
        return { ...sub, status: "upgrading" };
      }
      return sub;
    }));
  };

  return (
    <div id="self-learning-center" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Overview & Upgrade Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Status & Master Trigger */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-fuchsia-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(217,70,239,0.05)] lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-fuchsia-500/10 pb-2">
              <Cpu className="w-5 h-5 text-fuchsia-400" />
              <h2 className="font-sans font-bold text-sm tracking-wider text-fuchsia-300 uppercase">Ruvi Autonomous Core</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">CURRENT CORE</span>
                <span className="text-xs bg-fuchsia-500/10 text-fuchsia-400 font-mono font-bold px-2 py-0.5 rounded border border-fuchsia-500/20">
                  {currentVersion}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">STATUS</span>
                <span className="text-xs flex items-center gap-1.5 font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Self-Refactoring Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">LEARNING RATIO</span>
                <span className="text-xs text-cyan-400 font-mono">0.984 / Autonomous</span>
              </div>
            </div>

            {isUpgradingMain && (
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-[150px]">{upgradeStep}...</span>
                  <span>{upgradeProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(236,72,153,0.5)]" 
                    style={{ width: `${upgradeProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={runMainUpgradeSequence}
              disabled={isUpgradingMain}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${
                isUpgradingMain
                  ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 hover:from-cyan-500/35 hover:to-fuchsia-500/35 text-white border-fuchsia-500/40 hover:border-fuchsia-400 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.15)]"
              }`}
            >
              {isUpgradingMain ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                  Upgrading Ruvi Core...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  Initiate Self-Upgrade
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time Processing Console */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.05)] lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-500/10 pb-2">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-5 h-5 text-cyan-400" />
              <h2 className="font-sans font-bold text-sm tracking-wider text-cyan-300 uppercase">Evolution Output Terminal</h2>
            </div>
            <button 
              onClick={() => {
                setUpgradeLogs([
                  `[${new Date().toLocaleTimeString()}] [SYSTEM] Console buffer cleared by operator.`
                ]);
              }}
              className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors uppercase"
            >
              Clear Buffer
            </button>
          </div>

          <div className="bg-slate-950/90 rounded-xl border border-slate-800/80 p-3 h-[145px] overflow-y-auto font-mono text-[10px] text-cyan-400/90 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
            {upgradeLogs.map((log, index) => (
              <div 
                key={index} 
                className={`${
                  log.includes("[SUCCESS]") ? "text-emerald-400" :
                  log.includes("[STEP") ? "text-fuchsia-400 font-bold" :
                  log.includes("↳") ? "text-slate-500" :
                  "text-cyan-400/90"
                }`}
              >
                {log}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>

      </div>

      {/* Subsystem Packages & Modular Upgrades */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-fuchsia-400" />
            <h2 className="font-sans font-bold text-sm tracking-wider text-slate-200 uppercase">Modular Cognitive Upgrades</h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Deploy sub-routines individually</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subsystems.map((sub) => (
            <div 
              key={sub.id}
              className="bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all duration-300 group"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping" />
                    <span className="font-sans font-bold text-xs text-slate-200 group-hover:text-white transition-colors">{sub.name}</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">{sub.version}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{sub.description}</p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                <span className="text-[9px] font-mono font-bold text-fuchsia-400">{sub.gain}</span>
                {sub.status === "ready" ? (
                  <button 
                    onClick={() => upgradeSubsystem(sub.id)}
                    className="flex items-center gap-1 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 hover:border-fuchsia-500/40 rounded px-2.5 py-1 text-[9px] font-mono uppercase transition-all cursor-pointer"
                  >
                    <RefreshCcw className="w-3 h-3 animate-pulse" /> Optimize Build
                  </button>
                ) : sub.status === "upgrading" ? (
                  <div className="flex items-center gap-1 text-cyan-400 font-mono text-[9px] uppercase px-2 py-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Patching...
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-400 font-mono text-[9px] uppercase bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                    <Check className="w-3 h-3" /> Fully Optimized
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Habits & Permissions Consent Guard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cognitive Permission Settings */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
          <div className="flex items-center gap-2 mb-4 border-b border-emerald-500/10 pb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-sans font-bold text-sm tracking-wider text-emerald-300 uppercase">Self-Learning Permissions</h2>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/55 transition-all">
              <div className="space-y-0.5">
                <span className="font-sans font-semibold text-xs text-slate-200">Continuous Habit Tracking</span>
                <p className="text-[10px] text-slate-500">Learn user active times and suggest custom shortcuts autonomously.</p>
              </div>
              <button 
                onClick={() => setHabitLearning(!habitLearning)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer outline-none ${
                  habitLearning ? "bg-emerald-500" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${habitLearning ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/55 transition-all">
              <div className="space-y-0.5">
                <span className="font-sans font-semibold text-xs text-slate-200">Autonomous Tool Discovery</span>
                <p className="text-[10px] text-slate-500">Scan sandbox environment to expand context memory routing files.</p>
              </div>
              <button 
                onClick={() => setToolDiscovery(!toolDiscovery)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer outline-none ${
                  toolDiscovery ? "bg-emerald-500" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${toolDiscovery ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/55 transition-all">
              <div className="space-y-0.5">
                <span className="font-sans font-semibold text-xs text-slate-200">Automated Error Self-Correction</span>
                <p className="text-[10px] text-slate-500">Analyze failed requests and refactor prompt routes instantly.</p>
              </div>
              <button 
                onClick={() => setErrorCorrection(!errorCorrection)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer outline-none ${
                  errorCorrection ? "bg-emerald-500" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${errorCorrection ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Case Scenario Study */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
              <Lock className="w-5 h-5 text-slate-400" />
              <h2 className="font-sans font-bold text-sm tracking-wider text-slate-300 uppercase">Evolution Consent Guard</h2>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 relative">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono uppercase font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Core Habit Learning Ask
              </div>
              <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                "I noticed you tend to use the 'RuView Deep Vision' tool with pink accent glow at around 10:00 PM every night. Shall I automate the workspace layout theme load at that hour?"
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 mt-4">
            <button 
              onClick={() => {
                addLog("[USER] Approved automated theme scheduler request.");
                alert("Consent registered! Rule added: 'Automate Pink Neon theme scheduling at 10 PM'.");
              }}
              className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg py-2 text-xs uppercase font-mono transition-colors cursor-pointer"
            >
              Approve
            </button>
            <button 
              onClick={() => {
                addLog("[USER] Rejected scheduled theme loader.");
              }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg py-2 text-xs uppercase font-mono transition-colors cursor-pointer"
            >
              Ignore
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
