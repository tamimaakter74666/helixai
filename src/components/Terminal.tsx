import React, { useEffect, useState, useRef } from "react";
import { Terminal, Code2, Play } from "lucide-react";

export default function SimulatedTerminal() {
  const [logs, setLogs] = useState<string[]>([
    "Ruvi Core Kernel v3.5.1 Boot Sequence Initiated...",
    "[OK] Loaded Neural Engine weights from /sys/models/ruvi_base_v3.bin",
    "[OK] Established secure matrix tunnel to remote LLM orchestration server.",
  ]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [logs]);

  useEffect(() => {
    const fakeLogs = [
      "Running semantic integrity check...",
      "Allocating VRAM for generative vision transformer...",
      "[WARN] Memory spike detected in segment 0x0A94",
      "Compensating with dynamic paging...",
      "Ping: DeepSeek-R1 core module active.",
      "RadarSweep telemetry channel open at port 8092.",
      "Re-calibrating speech synthesis phonemes...",
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const randomLog = fakeLogs[Math.floor(Math.random() * fakeLogs.length)];
        const timestamp = new Date().toISOString().split("T")[1].substring(0, 12);
        setLogs((prev) => [...prev.slice(-30), `[${timestamp}] ${randomLog}`]);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl flex flex-col shadow-[0_0_15px_rgba(0,242,254,0.05)] h-64 overflow-hidden relative">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs text-slate-300 tracking-wider">
            RUVI_SYS_TERMINAL
          </span>
        </div>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500/50"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></span>
        </div>
      </div>
      <div ref={containerRef} className="p-3 overflow-y-auto flex-1 font-mono text-[10px] leading-relaxed text-emerald-400/80 space-y-1">
        {logs.map((log, i) => (
          <div key={i} className={`${log.includes("[WARN]") ? "text-amber-400" : log.includes("[OK]") ? "text-cyan-400" : ""}`}>
            <span className="opacity-50 select-none mr-2">{'>'}</span>{log}
          </div>
        ))}
      </div>
    </div>
  );
}
