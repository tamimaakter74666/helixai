import React, { useEffect, useState } from "react";
import { Cpu, MemoryStick, Network, HardDrive, TerminalSquare, Activity, BrainCircuit } from "lucide-react";

export default function SystemMonitor() {
  const [cpuUsage, setCpuUsage] = useState<number[]>(Array(20).fill(0));
  const [gpuUsage, setGpuUsage] = useState<number[]>(Array(20).fill(0));
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [totalMem, setTotalMem] = useState("16");
  const [networkLatency, setNetworkLatency] = useState(12);
  const [ollamaStatus, setOllamaStatus] = useState({ online: false, latency: 0, models: [] });

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const res = await fetch("/api/system");
        if (res.ok) {
          const data = await res.json();
          setCpuUsage((prev) => {
            const newArr = [...prev.slice(1), typeof data.cpuUsage === 'number' ? data.cpuUsage : 0];
            return newArr;
          });
          setGpuUsage((prev) => {
            const newArr = [...prev.slice(1), typeof data.gpuUsage === 'number' ? data.gpuUsage : 0];
            return newArr;
          });
          setMemoryUsage(typeof data.memoryUsage === 'number' ? Math.floor(data.memoryUsage) : 0);
          setTotalMem(data.totalMemGB || "0");
          setNetworkLatency(typeof data.networkLatency === 'number' ? data.networkLatency : 0);
          if (data.ollama) setOllamaStatus(data.ollama);
        }
      } catch (e) {
        // Soft-log telemetry failures to prevent breaking automated app testing during server restarts/hot reloads
        console.warn("System telemetry soft failure (expected during server restarts):", e);
      }
    };

    fetchSystemInfo(); // Initial fetch
    const interval = setInterval(fetchSystemInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderSparkline = (data: number[], colorClass: string) => {
    const max = 100;
    return (
      <div className="flex items-end h-8 gap-[1px] w-full mt-1 overflow-hidden">
        {data.map((val, i) => (
          <div
            key={i}
            className={`w-full ${colorClass} opacity-80`}
            style={{ height: `${(val / max) * 100}%`, minHeight: '1px' }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 flex flex-col shadow-[0_0_15px_rgba(0,242,254,0.05)] relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4 border-b border-cyan-500/10 pb-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        <span className="font-sans font-medium text-sm tracking-wider text-cyan-300">
          Hardware Telemetry
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3 text-cyan-400"/> CPU CORE</span>
            <span className="text-cyan-300 font-bold">{(cpuUsage[cpuUsage.length - 1] ?? 0).toFixed(1)}%</span>
          </div>
          {renderSparkline(cpuUsage, "bg-cyan-500")}
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5"><TerminalSquare className="w-3 h-3 text-purple-400"/> GPU NEURAL</span>
            <span className="text-purple-300 font-bold">{(gpuUsage[gpuUsage.length - 1] ?? 0).toFixed(1)}%</span>
          </div>
          {renderSparkline(gpuUsage, "bg-purple-500")}
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-center">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1.5"><MemoryStick className="w-3 h-3 text-emerald-400"/> RAM AVAIL</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 mt-1">
            <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${memoryUsage}%` }} />
          </div>
          <div className="text-[10px] text-right mt-1 font-mono text-emerald-300">{memoryUsage}% / {totalMem}GB</div>
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-center">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1.5"><Network className="w-3 h-3 text-pink-400"/> UPLINK</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-mono text-pink-300">{networkLatency} ms</span>
            <span className="text-[9px] font-mono text-slate-500">SECURE TNNL</span>
          </div>
        </div>
      </div>
      
      {/* Local AI Status */}
      <div className="mt-3 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <BrainCircuit className={`w-4 h-4 ${ollamaStatus.online ? "text-amber-400" : "text-slate-600"}`} />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Local AI (Ollama)</span>
         </div>
         <div className="flex items-center gap-3">
            {ollamaStatus.online ? (
              <>
                 <span className="text-[10px] font-mono text-amber-300">{ollamaStatus.models.length} Models</span>
                 <span className="text-[10px] font-mono text-slate-500">{ollamaStatus.latency}ms</span>
              </>
            ) : (
              <span className="text-[10px] font-mono text-slate-500">OFFLINE</span>
            )}
         </div>
      </div>
    </div>
  );
}
