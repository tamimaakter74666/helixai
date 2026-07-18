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
    let isMounted = true;
    let errorCount = 0;
    
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/logs?limit=30");
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            // Data is returned newest first usually, let's format them
            // Depending on the server implementation, we reverse them for the terminal view
            const formattedLogs = data.reverse().map((log: any) => {
              const time = new Date(log.timestamp).toISOString().split("T")[1].substring(0, 12);
              let prefix = "";
              if (log.level === "error") prefix = "[WARN] ";
              else if (log.level === "success") prefix = "[OK] ";
              else if (log.level === "info") prefix = "[INFO] ";
              
              return `[${time}] ${prefix}${log.category.toUpperCase()}: ${log.message}`;
            });
            
            // Keep some boot logs if real logs are few
            if (formattedLogs.length === 0) {
              setLogs([
                "Ruvi Core Kernel v3.5.1 Boot Sequence Initiated...",
                "[OK] System initialized, waiting for events...",
              ]);
            } else {
              setLogs(formattedLogs);
            }
            errorCount = 0;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch logs (expected during server boot/restarts):", err);
        errorCount++;
      }
    };

    fetchLogs();
    const interval = setInterval(() => {
       fetchLogs();
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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
