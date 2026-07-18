 
import React, { useEffect, useState, useRef } from "react";
import {
  Activity,
  Cpu,
  MemoryStick,
  Network,
  RefreshCw,
  Search,
  Trash2,
  Play,
  Sparkles,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Zap,
  Download,
  AlertCircle,
 
  Heart,
  Sliders,
  Database,
  BrainCircuit,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Mic,
  Clock,
  Code
} from "lucide-react";

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  category: "model" | "system" | "automation" | "speech" | "vision" | "security";
  message: string;
  details?: string;
}

export interface RequestTraceIteration {
  loopIndex: number;
  timestamp: string;
  promptSent: string;
  modelSelected?: string;
  providerSelected?: string;
  routingReason?: string;
  rawAIResponse?: string;
  parsedThought?: string;
  backendToolsCalled?: { command: string; data: any }[];
  clientCommandsCalled?: { command: string; data: any }[];
  toolResults?: { command: string; status: "success" | "error"; result?: any; error?: string }[];
}

export interface RequestTrace {
  id: string;
  timestamp: string;
  inputType: "chat" | "voice";
  inputMessage: string;
  detectedLanguage?: string;
  systemInstructionUsed?: string;
  iterations: RequestTraceIteration[];
  finalResponse?: string;
  finalSpeakText?: string;
  detectedEmotion?: string;
  isCompleted: boolean;
  totalLatencyMs?: number;
}

export default function SystemLogDashboard() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  // Tracing states
  const [activeTab, setActiveTab] = useState<"logs" | "traces">("logs");
  const [traces, setTraces] = useState<RequestTrace[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [tracingLoading, setTracingLoading] = useState(false);
  const [expandedIterations, setExpandedIterations] = useState<Record<number, boolean>>({ 0: true });

  // Telemetry state
  const [cpuUsage, setCpuUsage] = useState<number[]>(Array(20).fill(0));
  const [gpuUsage, setGpuUsage] = useState<number[]>(Array(20).fill(0));
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [totalMem, setTotalMem] = useState("16");
  const [networkLatency, setNetworkLatency] = useState(12);
  const [ollamaStatus, setOllamaStatus] = useState({ online: false, latency: 0, models: [] });

  // Optimization & Scanning States
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any[] | null>(null);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [activeTaskText, setActiveTaskText] = useState("");

  const playSynthesizer = (freq = 440, type = "sine", duration = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type as OscillatorType;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext block:", e);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logs?limit=300");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTraces = async () => {
    try {
      const res = await fetch("/api/traces?limit=100");
      if (res.ok) {
        const data = await res.json();
        setTraces(data);
      }
    } catch (err) {
      console.error("Failed to fetch traces:", err);
    }
  };

  const handleClearTraces = async () => {
    if (!confirm("Are you sure you want to purge all End-to-End Traces?")) return;
    try {
      playSynthesizer(300, "sawtooth", 0.3);
      const res = await fetch("/api/traces/clear", { method: "POST" });
      if (res.ok) {
        setTraces([]);
        setSelectedTraceId(null);
      }
    } catch (err) {
      console.error("Failed to clear traces:", err);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/system");
      if (res.ok) {
        const data = await res.json();
        setCpuUsage((prev) => [...prev.slice(1), typeof data.cpuUsage === 'number' ? data.cpuUsage : 0]);
        setGpuUsage((prev) => [...prev.slice(1), typeof data.gpuUsage === 'number' ? data.gpuUsage : 0]);
        setMemoryUsage(typeof data.memoryUsage === 'number' ? Math.floor(data.memoryUsage) : 0);
        setTotalMem(data.totalMemGB || "16");
        setNetworkLatency(typeof data.networkLatency === 'number' ? data.networkLatency : 0);
        if (data.ollama) setOllamaStatus(data.ollama);
      }
 
    } catch (_e) { /* empty */ }
  };

  useEffect(() => {
    fetchLogs();
    fetchTelemetry();
    fetchTraces();
    const interval = setInterval(() => {
      fetchLogs();
      fetchTelemetry();
      fetchTraces();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to purge all system logs?")) return;
    try {
      playSynthesizer(300, "sawtooth", 0.3);
      const res = await fetch("/api/logs/clear", { method: "POST" });
      if (res.ok) {
        setLogs([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeOptimization = async (actionId: string, label: string) => {
    setOptimizingId(actionId);
    setActiveTaskText(label);
    playSynthesizer(600, "triangle", 0.1);
    
    // Simulate some fancy visual progress
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const res = await fetch("/api/logs/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionId }),
      });
      if (res.ok) {
        playSynthesizer(880, "sine", 0.25);
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOptimizingId(null);
      setActiveTaskText("");
    }
  };

  const runDiagnosticsScan = async () => {
    setIsScanning(true);
    setScanResults(null);
    playSynthesizer(520, "sine", 0.1);
    await new Promise((r) => setTimeout(r, 600));
    playSynthesizer(660, "sine", 0.1);
    await new Promise((r) => setTimeout(r, 600));
    playSynthesizer(780, "sine", 0.1);
    await new Promise((r) => setTimeout(r, 800));

    // Construct diagnostics based on live metrics
    const currentCpu = cpuUsage[cpuUsage.length - 1] || 0;
    const issues = [];

    // Diagnostic 1: Local AI Status
    if (!ollamaStatus.online) {
      issues.push({
        id: "ollama_offline",
        title: "Ollama Offline Alert",
        severity: "warning",
        description: "Local Ollama service is unreachable. Brain Router has fallbacked seamlessly to secure cloud Gemini clusters.",
        suggestion: "Ensure Ollama desktop client is active in host and port 11434 is bound.",
        actionLabel: "Recalculate Model Scores",
        actionId: "rescore_models"
      });
    } else if (ollamaStatus.latency > 150) {
      issues.push({
        id: "ollama_slow",
        title: "Local Model Latency Elevated",
        severity: "warning",
        description: `Ollama heartbeat latency is currently high (${ollamaStatus.latency}ms), impacting local model response speeds.`,
        suggestion: "Optimize local hardware thread pooling and keep models hot-loaded.",
        actionLabel: "Verify Keep-Alive Tuner",
        actionId: "rescore_models"
      });
    }

    // Diagnostic 2: System Load
    if (currentCpu > 80) {
      issues.push({
        id: "cpu_hot",
        title: "CPU Load Threshold Transceeded",
        severity: "error",
        description: `Host CPU consumption is at ${currentCpu.toFixed(1)}%. Core execution is experiencing micro-delays.`,
        suggestion: "Temporarily clear transaction WS communication buffers to lower system interrupt cycle counts.",
        actionLabel: "Compromise WebSocket Buffers",
        actionId: "clear_buffers"
      });
    }

    // Diagnostic 3: Network Latency
    if (networkLatency > 150) {
      issues.push({
        id: "network_lag",
        title: "Secure Network Tunnel Delay",
        severity: "warning",
        description: `External telemetry latency is at ${networkLatency}ms. Streaming response handshakes may fluctuate.`,
        suggestion: "Optimize network routing tunnels to bypass crowded relays.",
        actionLabel: "De-bottleneck Uplink",
        actionId: "tunnel_optimize"
      });
    }

    // Diagnostic 4: Log Cache bloat
    if (logs.length > 500) {
      issues.push({
        id: "log_bloat",
        title: "Diagnostic Memory Cache Fragmentation",
        severity: "info",
        description: `Ruvi database telemetry buffer contains ${logs.length} active event instances.`,
        suggestion: "Run general defragmentation on context cache directories to preserve fast database reads.",
        actionLabel: "Defragment Cache Database",
        actionId: "defragment_cache"
      });
    }

    // Default Success state if everything is green
    if (issues.length === 0) {
      issues.push({
        id: "perfect_health",
        title: "Absolute System Sync (100%)",
        severity: "success",
        description: "No structural bottlenecks or execution lag detected. Memory indexes, network paths, and AI routers are operating at maximum efficiency.",
        suggestion: "System metrics look healthy! Keep tracking logs to find real-time optimization possibilities.",
        actionLabel: "Verify Global Autopilot",
        actionId: "global_autopilot"
      });
    }

    setScanResults(issues);
    setIsScanning(false);
    playSynthesizer(880, "sine", 0.3);
  };

  const handleExportLogs = () => {
    playSynthesizer(640, "sine", 0.1);
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(logs, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `ruvi_system_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter logs locally
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || log.category === selectedCategory;
    const matchesLevel = selectedLevel === "all" || log.level === selectedLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "error":
        return <XCircle className="w-4 h-4 text-pink-500" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      case "error":
        return "bg-pink-500/10 text-pink-400 border-pink-500/20";
      default:
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    }
  };

  const renderSparkline = (data: number[], colorClass: string) => {
    const max = 100;
    return (
      <div className="flex items-end h-8 gap-[1px] w-32 shrink-0 overflow-hidden bg-slate-950/40 p-1 rounded border border-slate-900">
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
    <div className="w-full flex flex-col gap-6 font-sans text-slate-100 pb-12">
      {/* Top Section: Dashboard Header & Live Telemetry Summary */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-stretch">
        <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(0,242,254,0.02)] flex-1 w-full">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold font-sans uppercase tracking-wider text-cyan-300">
                Ruvi System Diagnostic Log & Control Center
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              রুবির সামগ্রিক স্বাস্থ্য, এরর ট্র্যাকিং, মডেল রাউটিং এবং হার্ডওয়্যার পারফরম্যান্স মনিটর করার জন্য একটি সমন্বিত ড্যাশবোর্ড। এখান থেকে আপনি যেকোন সমস্যা সহজে সনাক্ত করে অপ্টিমাইজড রানিং কনফিগারেশনে পরিবর্তন করতে পারবেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={runDiagnosticsScan}
              disabled={isScanning}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs uppercase transition-all ${
                isScanning
                  ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 cursor-not-allowed"
                  : "bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:shadow-[0_0_15px_rgba(0,242,254,0.2)]"
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
              {isScanning ? "Scanning system logs..." : "Run AI Diagnostics Scan"}
            </button>

            <button
              onClick={handleExportLogs}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl font-mono text-xs uppercase transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export DB Logs
            </button>

            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-pink-950/20 hover:bg-pink-950/30 border border-pink-500/30 text-pink-400 rounded-xl font-mono text-xs uppercase transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Purge Logs Stream
            </button>
          </div>
        </div>

        {/* Dynamic Telemetry Mini Deck */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 lg:w-80 gap-3 shrink-0 w-full">
          {/* CPU */}
          <div className="bg-slate-900/60 border border-cyan-500/20 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-cyan-400" /> CPU Load</span>
              <span className="font-bold text-cyan-300">{(cpuUsage[cpuUsage.length - 1] ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex-1 bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${cpuUsage[cpuUsage.length - 1] || 0}%` }} />
              </div>
              {renderSparkline(cpuUsage, "bg-cyan-500")}
            </div>
          </div>

          {/* GPU */}
          <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><Terminal className="w-3 h-3 text-purple-400" /> Neural GPU</span>
              <span className="font-bold text-purple-300">{(gpuUsage[gpuUsage.length - 1] ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex-1 bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-400 h-full rounded-full" style={{ width: `${gpuUsage[gpuUsage.length - 1] || 0}%` }} />
              </div>
              {renderSparkline(gpuUsage, "bg-purple-500")}
            </div>
          </div>

          {/* RAM */}
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><MemoryStick className="w-3 h-3 text-emerald-400" /> RAM Buffers</span>
              <span className="font-bold text-emerald-300">{memoryUsage}%</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] font-mono">
              <span className="text-slate-500">{totalMem} GB Host</span>
              <span className="text-emerald-400">{Math.floor((memoryUsage / 100) * parseFloat(totalMem)).toFixed(1)} GB used</span>
            </div>
          </div>

          {/* UPLINK */}
          <div className="bg-slate-900/60 border border-pink-500/20 rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><Network className="w-3 h-3 text-pink-400" /> Tunnel Latency</span>
              <span className="font-bold text-pink-300">{networkLatency} ms</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] font-mono">
              <span className={`px-1 rounded text-[9px] uppercase ${ollamaStatus.online ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                Local AI: {ollamaStatus.online ? 'ONLINE' : 'OFFLINE'}
              </span>
              <span className="text-slate-500">Secure pipeline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics / Problem Solver Panel */}
      {(isScanning || scanResults) && (
        <div className="bg-slate-900/40 backdrop-blur-md border border-cyan-500/20 p-5 rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.04)] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyan-500/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-sans font-semibold text-sm tracking-wide text-cyan-300 uppercase font-mono">
                AI Autopilot Diagnostic Scan Results
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Real-time Host Telemetry Evaluation
            </span>
          </div>

          {isScanning ? (
            <div className="flex flex-col items-center justify-center py-8 text-center font-mono text-xs text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3" />
              <span className="animate-pulse">RUNNING CORE KERNEL BENCHMARKS & VERIFYING ERROR FREQUENCIES...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scanResults?.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 bg-slate-950/80 transition-all ${
                    issue.severity === "error"
                      ? "border-pink-500/30 hover:border-pink-500/50"
                      : issue.severity === "warning"
                      ? "border-amber-500/30 hover:border-amber-500/50"
                      : issue.severity === "success"
                      ? "border-emerald-500/30 hover:border-emerald-500/50 shadow-[inset_0_0_15px_rgba(16,185,129,0.03)]"
                      : "border-cyan-500/20 hover:border-cyan-500/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {getLevelIcon(issue.severity)}
                      <span className="font-sans font-bold text-sm text-slate-100">{issue.title}</span>
                      <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ml-auto shrink-0 ${getLevelBadgeClass(issue.severity)}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{issue.description}</p>
                    <div className="mt-3 bg-slate-900/60 p-2.5 rounded border border-slate-900 text-[10px] text-slate-400 font-mono flex items-start gap-1.5 leading-normal">
                      <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-cyan-300 uppercase font-bold">Fix Suggestion:</span> {issue.suggestion}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => executeOptimization(issue.actionId, issue.actionLabel)}
                    disabled={optimizingId !== null}
                    className={`w-full mt-2 py-2 px-3 text-[10px] font-mono uppercase rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      optimizingId === issue.actionId
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 cursor-wait"
                        : "bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-cyan-500/40 text-slate-200"
                    }`}
                  >
                    {optimizingId === issue.actionId ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {activeTaskText}...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-cyan-400" />
                        {issue.actionLabel}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 gap-2 mb-2">
        <button
          onClick={() => { setActiveTab("logs"); playSynthesizer(520, "sine", 0.08); }}
          className={`px-5 py-3 font-sans font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "logs"
              ? "border-cyan-400 text-cyan-300 bg-cyan-950/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          System Logs Stream
        </button>
        <button
          onClick={() => { setActiveTab("traces"); playSynthesizer(580, "sine", 0.08); }}
          className={`px-5 py-3 font-sans font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "traces"
              ? "border-pink-500 text-pink-300 bg-pink-950/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-pink-500" />
          E2E Request Tracing (Observability)
        </button>
      </div>

      {activeTab === "logs" ? (
        /* Main Bottom Split Grid: Optimization Deck & Event Stream */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          {/* Left: Manual Optimization Tools Deck */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="font-sans font-semibold text-sm tracking-wide text-slate-300 uppercase">
                Manual Optimization Deck
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              কোন সমস্যা সনাক্ত করার পর অথবা রানিং পারফরম্যান্স সর্বোচ্চ গতিতে রাখার জন্য আপনি নিচের টাস্কগুলি ম্যানুয়ালি রান করতে পারেন:
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => executeOptimization("global_autopilot", "Optimizing Kernel threads")}
                disabled={optimizingId !== null}
                className="w-full p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/30 text-left rounded-xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">Global Diagnostics Tuning</span>
                    <span className="text-[9px] text-slate-500 font-mono">Autopilot diagnosis & repair run</span>
                  </div>
                </div>
                <Play className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </button>

              <button
                onClick={() => executeOptimization("clear_buffers", "Flushing WebSocket buffers")}
                disabled={optimizingId !== null}
                className="w-full p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/30 text-left rounded-xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                    <Network className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">Compromise WS Buffers</span>
                    <span className="text-[9px] text-slate-500 font-mono">Clean WS transaction queues</span>
                  </div>
                </div>
                <Play className="w-3 h-3 text-slate-600 group-hover:text-pink-400 transition-colors" />
              </button>

              <button
                onClick={() => executeOptimization("defragment_cache", "Compacting JSON indexes")}
                disabled={optimizingId !== null}
                className="w-full p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/30 text-left rounded-xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">Defragment Telemetry DB</span>
                    <span className="text-[9px] text-slate-500 font-mono">Optimize context database indexing</span>
                  </div>
                </div>
                <Play className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button
                onClick={() => executeOptimization("rescore_models", "Evaluating Ollama models")}
                disabled={optimizingId !== null}
                className="w-full p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/30 text-left rounded-xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <BrainCircuit className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">Recalculate AI Scores</span>
                    <span className="text-[9px] text-slate-500 font-mono">Manually scoring Ollama latency</span>
                  </div>
                </div>
                <Play className="w-3 h-3 text-slate-600 group-hover:text-purple-400 transition-colors" />
              </button>
            </div>

            {optimizingId && (
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center gap-3 animate-pulse">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-cyan-400">Autopilot Task Executing</span>
                  <span className="text-xs font-semibold text-white">{activeTaskText}...</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Logs Stream View */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col overflow-hidden">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-sans font-semibold text-sm tracking-wide text-slate-300 uppercase">
                  Diagnostic Logs Stream
                </span>
                <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                  {filteredLogs.length} matching
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  className="p-1.5 hover:bg-slate-800 border border-transparent hover:border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="Reload Logs"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Search Input */}
              <div className="sm:col-span-1 bg-slate-950 rounded-xl px-3 py-1.5 flex items-center gap-2 border border-slate-800">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-xs w-full text-white placeholder-slate-600"
                />
              </div>

              {/* Category Select */}
              <div className="bg-slate-950 rounded-xl px-3 py-1.5 flex items-center gap-2 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent outline-none text-xs text-cyan-300 w-full cursor-pointer focus:outline-none"
                >
                  <option value="all">All Logs</option>
                  <option value="model">Model Routing</option>
                  <option value="system">System Resource</option>
                  <option value="automation">Automation Sync</option>
                  <option value="speech">Speech Engine</option>
                  <option value="vision">Vision OCR</option>
                  <option value="security">Security Guard</option>
                </select>
              </div>

              {/* Severity Select */}
              <div className="bg-slate-950 rounded-xl px-3 py-1.5 flex items-center gap-2 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Severity:</span>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-transparent outline-none text-xs text-cyan-300 w-full cursor-pointer focus:outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>

            {/* Logs Table Area */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/50">
              <table className="min-w-full divide-y divide-slate-900 font-mono text-[11px] leading-relaxed">
                <thead className="bg-slate-950 text-slate-400 text-left">
                  <tr>
                    <th className="px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Timestamp</th>
                    <th className="px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Level</th>
                    <th className="px-3 py-2.5 font-medium uppercase tracking-wider text-[10px]">Category</th>
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-[10px]">Message Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 bg-transparent text-slate-300">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false
                        })}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase border font-semibold ${getLevelBadgeClass(log.level)}`}>
                          {getLevelIcon(log.level)}
                          {log.level}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap uppercase text-[10px] text-slate-400">
                        {log.category}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-sans font-medium text-slate-200">{log.message}</div>
                        {log.details && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1 break-all bg-slate-950/50 p-1.5 rounded border border-slate-900 max-w-lg">
                            {log.details}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-xs font-mono">
                        {loading ? "FETCHING TELEMETRY STREAMS..." : "No matching system logs discovered."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================== E2E REQUEST TRACING VIEW ================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          {/* Left panel: List of Request Traces */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-400" />
                <span className="font-sans font-semibold text-sm tracking-wide text-slate-300 uppercase">
                  Cognitive Traces
                </span>
                <span className="text-[9px] font-mono bg-pink-500/10 text-pink-300 border border-pink-500/20 px-1.5 py-0.5 rounded">
                  {traces.length} total
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchTraces}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                  title="Reload Traces"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleClearTraces}
                  className="p-1 hover:bg-slate-800 text-pink-400 hover:text-pink-300 rounded transition-colors"
                  title="Purge Traces"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal font-sans">
              রানিং চ্যাট অথবা ভয়েস কম্যান্ডের প্রতিটি স্টেপ-বাই-স্টেপ প্রম্পট রাউটিং ও এক্সিকিউশন ডিটেইলস দেখতে নিচের যেকোনো একটি রিকোয়েস্ট সিলেক্ট করুন:
            </p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 select-none">
              {traces.map((trace) => {
                const isSelected = selectedTraceId === trace.id;
                return (
                  <div
                    key={trace.id}
                    onClick={() => {
                      setSelectedTraceId(trace.id);
                      playSynthesizer(440, "sine", 0.05);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-pink-950/20 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.05)]"
                        : "bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase truncate max-w-[120px]">
                        ID: {trace.id.split("-")[0]}...
                      </span>
                      <span className="text-[8px] font-mono text-slate-400 shrink-0">
                        {new Date(trace.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {trace.inputType === "voice" ? (
                        <Mic className="w-3.5 h-3.5 text-pink-400 shrink-0 animate-pulse" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
                        {trace.inputMessage}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-800/40 pt-1.5 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        {trace.totalLatencyMs ? `${(trace.totalLatencyMs / 1000).toFixed(2)}s` : "Pending..."}
                      </span>
                      <span className={`px-1 rounded uppercase ${trace.isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300'}`}>
                        {trace.isCompleted ? "COMPLETED" : "PROCESSING"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {traces.length === 0 && (
                <div className="py-12 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                  No active request traces captured.
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Details of Selected Trace */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-sm min-h-[400px]">
            {selectedTraceId ? (
              (() => {
                const trace = traces.find((t) => t.id === selectedTraceId);
                if (!trace) {
                  return (
                    <div className="h-[400px] flex items-center justify-center font-mono text-xs text-slate-500 uppercase">
                      Trace data no longer available.
                    </div>
                  );
                }

                return (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Header */}
                    <div className="border-b border-slate-800 pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-pink-400" />
                          <h3 className="font-sans font-bold text-base text-slate-100">
                            E2E Trace Execution Flow
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono bg-pink-500/10 border border-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full select-all font-bold">
                          UUID: {trace.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500 uppercase text-[9px] block">Trigger Type</span>
                          <span className="text-slate-200 font-semibold uppercase flex items-center gap-1 mt-0.5">
                            {trace.inputType === "voice" ? <Mic className="w-3 h-3 text-pink-400" /> : <MessageSquare className="w-3 h-3 text-cyan-400" />}
                            {trace.inputType}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase text-[9px] block">Captured Language</span>
                          <span className="text-slate-200 font-semibold mt-0.5 block">
                            {trace.detectedLanguage || "Default (Detect)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase text-[9px] block">Cognitive Loops</span>
                          <span className="text-slate-200 font-semibold mt-0.5 block">
                            {trace.iterations.length} iterations
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase text-[9px] block">Total Process Time</span>
                          <span className="text-pink-400 font-semibold mt-0.5 block">
                            {trace.totalLatencyMs ? `${(trace.totalLatencyMs / 1000).toFixed(2)} sec` : "In-flight"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pipeline Visual Timeline */}
                    <div className="space-y-4">
                      {/* Step 1: Input Detection */}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xs text-cyan-300 font-mono font-bold shrink-0">
                            1
                          </div>
                          <div className="w-[1px] bg-slate-800 flex-1 my-1" />
                        </div>
                        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex-1">
                          <span className="text-[9px] font-mono uppercase font-bold text-cyan-400">Step 1: Input Intake Pipeline</span>
                          <p className="text-sm font-sans font-medium text-white mt-1 leading-relaxed">
                            "{trace.inputMessage}"
                          </p>
                          <div className="mt-2 text-[10px] font-mono text-slate-500">
                            Logged: {new Date(trace.timestamp).toLocaleTimeString()} · Language Detected: {trace.detectedLanguage || "bn-BD"}
                          </div>
                        </div>
                      </div>

                      {/* Step 2: System Instruction Used */}
                      {trace.systemInstructionUsed && (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xs text-purple-300 font-mono font-bold shrink-0">
                              2
                            </div>
                            <div className="w-[1px] bg-slate-800 flex-1 my-1" />
                          </div>
                          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex-1">
                            <span className="text-[9px] font-mono uppercase font-bold text-purple-400">Step 2: Core Brain System Instruction</span>
                            <div className="text-[10px] text-slate-300 font-mono bg-slate-950 p-2 rounded border border-slate-900 mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                              {trace.systemInstructionUsed}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Iterations Loop */}
                      {trace.iterations.map((iter, idx) => {
                        const isExpanded = expandedIterations[idx] !== false;
                        return (
                          <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-xs text-pink-300 font-mono font-bold shrink-0">
                                {idx + 3}
                              </div>
                              <div className="w-[1px] bg-slate-800 flex-1 my-1" />
                            </div>
                            <div className="bg-slate-950/60 p-4 rounded-xl border border-pink-500/10 flex-1 space-y-3">
                              <div
                                className="flex items-center justify-between cursor-pointer border-b border-slate-800/50 pb-2 select-none"
                                onClick={() => setExpandedIterations(prev => ({ ...prev, [idx]: !isExpanded }))}
                              >
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-mono uppercase font-bold text-pink-400">
                                    Loop Iteration {iter.loopIndex} (Cognitive Agent Process)
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Model: {iter.modelSelected || "Default Router"} via {iter.providerSelected || "gemini"} · Reason: {iter.routingReason || "Autonomous routing decisions"}
                                  </span>
                                </div>
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                              </div>

                              {isExpanded && (
                                <div className="space-y-4 pt-1 animate-in slide-in-from-top-1 duration-100">
                                  {/* Raw Prompt Sent */}
                                  <div>
                                    <span className="text-[9px] font-mono uppercase text-slate-500">Synthesized Prompt Input</span>
                                    <div className="bg-slate-950 p-2.5 rounded border border-slate-900 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed mt-1">
                                      {iter.promptSent}
                                    </div>
                                  </div>

                                  {/* Parsed Thought Process */}
                                  {iter.parsedThought && (
                                    <div>
                                      <span className="text-[9px] font-mono uppercase text-pink-400 font-bold">Brain Core Thought Stream</span>
                                      <div className="bg-slate-950/80 p-3 rounded-xl border border-pink-500/10 text-[10.5px] font-mono text-emerald-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap mt-1">
                                        {iter.parsedThought}
                                      </div>
                                    </div>
                                  )}

                                  {/* Backend Tools Executed */}
                                  {iter.backendToolsCalled && iter.backendToolsCalled.length > 0 && (
                                    <div className="space-y-2">
                                      <span className="text-[9px] font-mono uppercase text-amber-400 font-bold block">
                                        Backend System Tools Called
                                      </span>
                                      <div className="space-y-2">
                                        {iter.backendToolsCalled.map((tool, tIdx) => {
                                          const result = iter.toolResults?.find(r => r.command === tool.command);
                                          return (
                                            <div key={tIdx} className="bg-slate-950 rounded-xl border border-slate-900 p-2.5 text-[10px] font-mono leading-normal">
                                              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-900/50">
                                                <span className="text-cyan-400 font-bold uppercase">{tool.command}</span>
                                                {result ? (
                                                  <span className={`px-1 rounded font-bold uppercase text-[8px] border ${
                                                    result.status === "success"
                                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                      : "bg-pink-500/10 border-pink-500/20 text-pink-400"
                                                  }`}>
                                                    {result.status}
                                                  </span>
                                                ) : (
                                                  <span className="bg-slate-800 text-slate-400 text-[8px] px-1 rounded uppercase">
                                                    In Progress
                                                  </span>
                                                )}
                                              </div>
                                              <div>
                                                <span className="text-slate-500">Arguments:</span>
                                                <span className="text-slate-300"> {JSON.stringify(tool.data)}</span>
                                              </div>
                                              {result && (
                                                <div className="mt-1">
                                                  <span className="text-slate-500">Returned Result:</span>
                                                  <pre className="mt-1 bg-slate-900 p-2 rounded text-slate-300 overflow-x-auto whitespace-pre-wrap leading-normal font-sans text-[11px]">
                                                    {result.result ? (typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2)) : result.error}
                                                  </pre>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Client Commands called */}
                                  {iter.clientCommandsCalled && iter.clientCommandsCalled.length > 0 && (
                                    <div className="space-y-2">
                                      <span className="text-[9px] font-mono uppercase text-indigo-400 font-bold block">
                                        Queued Client-Side Actions
                                      </span>
                                      <div className="space-y-1.5">
                                        {iter.clientCommandsCalled.map((cmd, cIdx) => (
                                          <div key={cIdx} className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-[10px] font-mono flex items-center justify-between">
                                            <span className="text-indigo-300 font-bold uppercase">{cmd.command}</span>
                                            <span className="text-slate-500">Data: {JSON.stringify(cmd.data)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Step 4: Final Response Delivered */}
                      {trace.isCompleted && (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-300 font-mono font-bold shrink-0">
                              {trace.iterations.length + 3}
                            </div>
                          </div>
                          <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-500/10 flex-1 space-y-3">
                            <span className="text-[9px] font-mono uppercase font-bold text-emerald-400 block">
                              Final Step: Cognitive Synthesis & Response Dispatch
                            </span>
                            
                            <div>
                              <span className="text-[9px] font-mono uppercase text-slate-500">Rendered markdown Output</span>
                              <div className="mt-1 bg-slate-950 p-3 rounded-lg border border-slate-900 text-sm font-sans text-slate-100 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {trace.finalResponse}
                              </div>
                            </div>

                            {trace.finalSpeakText && (
                              <div>
                                <span className="text-[9px] font-mono uppercase text-slate-500">Synthesized TTS Speak Output</span>
                                <p className="text-xs font-sans text-slate-400 mt-1 italic leading-relaxed">
                                  "{trace.finalSpeakText}"
                                </p>
                              </div>
                            )}

                            {trace.detectedEmotion && (
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-900">
                                <span className="text-[9px] font-mono uppercase text-slate-500">Synthesized Emotion Vibe:</span>
                                <span className="text-xs font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                  {trace.detectedEmotion}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center">
                <BrainCircuit className="w-12 h-12 text-pink-500/20 mb-3 animate-pulse" />
                <span className="font-sans font-bold text-slate-400 text-sm tracking-wide uppercase">
                  No Trace Selected
                </span>
                <p className="text-xs text-slate-500 font-sans max-w-sm mt-1 leading-relaxed">
                  বামদিকের রিসেন্ট রিকোয়েস্ট লিস্ট থেকে যেকোনো একটি রিকোয়েস্ট সিলেক্ট করে এর এন্ড-টু-এন্ড রুট এবং এক্সিকিউশন প্রসেস গ্রাফ দেখুন।
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
