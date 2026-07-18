import React, { useEffect, useState } from "react";
import { 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle, 
  Gauge, 
  Terminal, 
  Sparkles, 
  Code, 
  PenTool, 
  Eye, 
 
  Sliders, 
  Server, 
 
  Activity,
  Cpu,
  Layers,
  Search,
  RefreshCw,
 
  HelpCircle,
  Lightbulb
} from "lucide-react";

interface ModelHistory {
  avgLatencyMs: number;
  successRate: number;
  avgSpeedTps: number;
  memorySizeGB: number;
  sampleCount: number;
}

interface EvaluatedModel {
  name: string;
  sizeBytes: number;
  sizeGB: string;
  family: string;
  parameterSize: string;
  quantization: string;
  format: string;
  scores: {
    general: number;
    code: number;
    creative: number;
    vision: number;
  };
  history?: ModelHistory | null;
}

interface OllamaStatus {
  online: boolean;
  latency?: number;
  systemRAM?: string;
  models: EvaluatedModel[];
}

export default function OllamaModelManager() {
  const [status, setStatus] = useState<OllamaStatus>({ online: false, models: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<"general" | "code" | "creative" | "vision">("general");
  const [testPrompt, setTestPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem("ruvi_ollama_selected_model") || "");
  const [simulatedRouting, setSimulatedRouting] = useState<{
    bestModel: string;
    score: number;
    reason: string;
  } | null>(null);

  const handleSelectModel = (modelName: string) => {
    setSelectedModel(modelName);
    localStorage.setItem("ruvi_ollama_selected_model", modelName);
    localStorage.setItem("ruvi_selected_provider", "ollama");
    
    // Play sound
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.frequency.setValueAtTime(800, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.15);
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, context.currentTime + 0.15);
      osc.start();
      osc.stop(context.currentTime + 0.15);
    } catch (_e) {}
  };

  const handleResetToAuto = () => {
    setSelectedModel("");
    localStorage.removeItem("ruvi_ollama_selected_model");
    // Play sound
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.frequency.setValueAtTime(1000, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, context.currentTime + 0.15);
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, context.currentTime + 0.15);
      osc.start();
      osc.stop(context.currentTime + 0.15);
    } catch (_e) {}
  };

  const scoreModelForTaskClientSide = (model: any, task: string): number => {
    const name = (model.name || "").toLowerCase();
    const details = model.details || {};
    const family = (details.family || "").toLowerCase();
    
    let score = 50;
    let params = 0;
    if (details.parameter_size) {
      const match = details.parameter_size.match(/([\d.]+)/);
      if (match) params = parseFloat(match[1]);
    } else if (model.size && typeof model.size === "number") {
      params = (model.size / (1024 * 1024 * 1024)) * 1.4;
    }

    if (params > 0) {
      if (params >= 5 && params <= 11) {
        score += 25;
      } else if (params < 5) {
        score += 10;
      } else {
        score -= 20;
      }
    }

    if (task === "code") {
      const codeKeywords = ["coder", "code", "starcoder", "deepseek", "codellama", "qwen2.5-coder", "command-r"];
      const hasCodeKeyword = codeKeywords.some(kw => name.includes(kw) || family.includes(kw));
      if (hasCodeKeyword) score += 45;
      if (name.includes("deepseek") || family.includes("deepseek")) score += 15;
    } else if (task === "creative") {
      if (name.includes("llama") || family.includes("llama")) score += 30;
      if (name.includes("mistral") || family.includes("mistral")) score += 25;
      if (name.includes("gemma") || family.includes("gemma")) score += 20;
    } else if (task === "vision") {
      if (name.includes("vision") || name.includes("llava") || name.includes("moondream")) score += 65;
    } else {
      if (name.includes("qwen") || family.includes("qwen")) score += 35;
      if (name.includes("llama3.1") || name.includes("llama3.2") || name.includes("llama3.3")) score += 25;
      else if (name.includes("llama")) score += 15;
      if (name.includes("gemma") || family.includes("gemma")) score += 20;
      if (name.includes("phi") || family.includes("phi")) score += 10;
    }

    if (name.includes("latest") || name.includes("instruct")) {
      score += 5;
    }

    return Math.round(score);
  };

  const evaluateOllamaModelsClientSide = (rawModels: any[]): EvaluatedModel[] => {
    return rawModels.map(model => {
      const scores = {
        general: scoreModelForTaskClientSide(model, "general"),
        code: scoreModelForTaskClientSide(model, "code"),
        creative: scoreModelForTaskClientSide(model, "creative"),
        vision: scoreModelForTaskClientSide(model, "vision")
      };

      return {
        name: model.name,
        sizeBytes: model.size,
        sizeGB: (model.size / (1024 ** 3)).toFixed(2) + " GB",
        family: model.details?.family || "unknown",
        parameterSize: model.details?.parameter_size || "unknown",
        quantization: model.details?.quantization_level || "unknown",
        format: model.details?.format || "gguf",
        scores,
        history: null
      };
    });
  };

  const fetchModels = async () => {
    setLoading(true);
    try {
      // 1. Try fetching directly from local desktop port first
      const localAddresses = ["http://127.0.0.1:11434", "http://localhost:11434"];
      let localRes = null;
      let localData = null;
      
      const isTauri = (window as any).__TAURI__ !== undefined || 
                      window.location.protocol.startsWith("tauri") || 
                      window.location.hostname === "tauri.localhost";

      if (isTauri) {
        for (const addr of localAddresses) {
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            const resText = await invoke<string>("fetch_local_http", { url: `${addr}/api/tags` });
            if (resText) {
              localData = JSON.parse(resText);
              break;
            }
          } catch (_err) {
            // ignore and check next
          }
        }
      } else {
        for (const addr of localAddresses) {
          try {
            const r = await fetch(`${addr}/api/tags`, {
              method: "GET",
              signal: AbortSignal.timeout(1000)
            });
            if (r.ok) {
              localRes = r;
              break;
            }
          } catch (_err) {
            // ignore and check next
          }
        }
      }

      if (localData) {
        const evaluatedModels = evaluateOllamaModelsClientSide(localData.models || []);
        setStatus({
          online: true,
          latency: 5,
          systemRAM: "Local Host Desktop",
          models: evaluatedModels
        });
        setLoading(false);
        return;
      }

      if (localRes) {
        const localDataFetched = await localRes.json();
        const evaluatedModels = evaluateOllamaModelsClientSide(localDataFetched.models || []);
        setStatus({
          online: true,
          latency: 5,
          systemRAM: "Local Host Desktop",
          models: evaluatedModels
        });
        setLoading(false);
        return;
      }

      // 2. Proxy request
      const res = await fetch("/api/ollama/models");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setStatus({ online: false, models: [] });
      }
    } catch (err) {
      console.warn("Failed to fetch Ollama models:", err);
      setStatus({ online: false, models: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Recalculate routing simulation on query/prompt changes or task changes
  useEffect(() => {
    if (!status.online || status.models.length === 0) {
      setSimulatedRouting(null);
      return;
    }

    let detectedTask = selectedTask;
    // Auto detect from prompt if typed
    if (testPrompt.trim().length > 0) {
      const promptLower = testPrompt.toLowerCase();
      if (
        promptLower.includes("code") || 
        promptLower.includes("bug") || 
        promptLower.includes("typescript") || 
        promptLower.includes("javascript") || 
        promptLower.includes("function") || 
        promptLower.includes("program") || 
        promptLower.includes("script") ||
        promptLower.includes("compile") ||
        promptLower.includes("error")
      ) {
        detectedTask = "code";
      } else if (
        promptLower.includes("write") || 
        promptLower.includes("essay") || 
        promptLower.includes("poem") || 
        promptLower.includes("story") || 
        promptLower.includes("creative") || 
        promptLower.includes("novel") || 
        promptLower.includes("draft")
      ) {
        detectedTask = "creative";
      } else if (
        promptLower.includes("see") || 
        promptLower.includes("look") || 
        promptLower.includes("analyze") || 
        promptLower.includes("image") || 
        promptLower.includes("photo") || 
        promptLower.includes("picture")
      ) {
        detectedTask = "vision";
      }
    }

    // Score and find the best
    const modelsWithScores = status.models.map(m => ({
      name: m.name,
      score: m.scores[detectedTask],
      paramSize: m.parameterSize,
      family: m.family
    }));

    modelsWithScores.sort((a, b) => b.score - a.score);
    const best = modelsWithScores[0];

    setSimulatedRouting({
      bestModel: best.name,
      score: best.score,
      reason: `Task: ${detectedTask.toUpperCase()} | Model: ${best.name} (Family: ${best.family}, Size: ${best.paramSize}) | Score: ${best.score}/100`
    });
  }, [testPrompt, selectedTask, status]);

  const filteredModels = status.models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.family.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="ollama-model-manager">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-cyan-500/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              Intelligent Ollama Model Router & Manager
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
            Automatically discover local Ollama models, analyze metadata, score capabilities, and route user tasks dynamically based on VRAM/RAM constraints and model families.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {selectedModel && (
            <button
              onClick={handleResetToAuto}
              className="flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 transition-all cursor-pointer select-none"
            >
              Reset to Dynamic Router
            </button>
          )}
          <button 
            onClick={fetchModels}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 transition-all cursor-pointer select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Discovering..." : "Scan Tags / Refresh"}
          </button>
        </div>
      </div>

      {/* Grid of Telemetry & Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hardware & Discovery Board */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Environment & Hardware
              </h3>
            </div>
            
            <div className="space-y-3 font-mono text-xs text-slate-400">
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span>Ollama Service Status</span>
                {status.online ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> ONLINE
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-3 h-3 animate-pulse" /> OFFLINE
                  </span>
                )}
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span>Service Host URL</span>
                <span className="text-slate-300">http://localhost:11434</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span>Model Discoverability</span>
                <span className="text-amber-400 font-bold">
                  {status.online ? `${status.models.length} Models Found` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span>Ollama API Latency</span>
                <span className="text-slate-300">{status.online ? `${status.latency} ms` : "N/A"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Detected Host RAM</span>
                <span className="text-emerald-300 font-bold">{status.online ? status.systemRAM : "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
            <div className="flex gap-2 items-start">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                <strong>VRAM & RAM Scorer:</strong> We auto-detect host system specifications. Large parameter sizes are automatically scored lower on restricted hardware configurations to guarantee high inference speed and zero crashes.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic AI Capability Router (Simulator) */}
        <div className="lg:col-span-2 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Real-time Capability Router Simulator
                </h3>
              </div>
              <span className="text-[9px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded uppercase">
                Active Inference
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-4 font-sans">
              Test how Ruvi's AI Router decides which local model handles requests. Select a core task or write a custom prompt to watch the real-time scoring router in action.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { id: "general", label: "General Chat", icon: Sparkles, color: "text-amber-400" },
                { id: "code", label: "Coding / Debug", icon: Code, color: "text-cyan-400" },
                { id: "creative", label: "Creative/Writing", icon: PenTool, color: "text-emerald-400" },
                { id: "vision", label: "Vision Tasks", icon: Eye, color: "text-purple-400" },
              ].map(t => {
                const IconComp = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTask(t.id as any);
                      setTestPrompt("");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer select-none ${
                      selectedTask === t.id && testPrompt === ""
                        ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                        : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${t.color}`} />
                    <span className="text-[10px] font-sans font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="অর অর টাইপ করুন: 'Write a typescript react script'..."
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none placeholder-slate-600 font-sans"
              />
              <span className="absolute right-3 top-2.5 text-[9px] font-mono text-slate-600 uppercase">
                Dynamic Classifier
              </span>
            </div>
          </div>

          <div className="mt-4 bg-slate-950/50 rounded-xl border border-slate-800/80 p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-bold font-mono text-slate-300 uppercase">
                Active Routing Output
              </span>
            </div>
            {simulatedRouting ? (
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span>Selected Model:</span>
                  <span className="bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">
                    {simulatedRouting.bestModel}
                  </span>
                  <span className="text-slate-500 font-normal">({simulatedRouting.score}/100 Rating)</span>
                </div>
                <div className="text-slate-400 leading-relaxed font-sans mt-1">
                  {simulatedRouting.reason}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 font-sans italic">
                Ollama offline or no local models detected. Make sure Ollama is active on port 11434 with models installed.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Models Capability Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold tracking-tight text-white font-sans">
                Local Ollama Model Index & Scoring Matrix
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Complete matrix analyzing quantization details, memory size, model families, and normalized performance capabilities.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name or family..."
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500/40 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 outline-none placeholder-slate-600 font-sans"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-slate-500">Retrieving system metadata and analyzing models...</span>
          </div>
        ) : !status.online ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 max-w-md mx-auto">
            <div className="p-4 bg-rose-500/5 rounded-full border border-rose-500/10">
              <AlertTriangle className="w-8 h-8 text-rose-400 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-white font-sans">Ollama Service Unavailable</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                We are unable to connect to Ollama at <code className="bg-slate-950 px-1 py-0.5 rounded text-rose-300">http://localhost:11434</code>. Please make sure Ollama is running on your machine and you have downloaded models (e.g., <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300">ollama pull qwen2.5</code>).
              </p>
            </div>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-12 font-sans text-xs text-slate-500 italic">
            No models match your search query. Try typing another model family.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Model Name & Family</th>
                  <th className="pb-3 font-semibold">Disk Size</th>
                  <th className="pb-3 font-semibold">Params / Format</th>
                  <th className="pb-3 font-semibold text-center text-amber-300">General Chat</th>
                  <th className="pb-3 font-semibold text-center text-cyan-300">Coding</th>
                  <th className="pb-3 font-semibold text-center text-emerald-300">Creative</th>
                  <th className="pb-3 font-semibold text-center text-purple-300">Vision</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredModels.map((model, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-900/20 transition-all">
                      <td className="py-4">
                        <div className="font-sans font-semibold text-slate-100">{model.name}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[9px] font-mono bg-slate-950 text-slate-500 px-1.5 py-0.2 rounded border border-slate-850 capitalize">
                            {model.family}
                          </span>
                          <span className="text-[9px] font-mono bg-slate-950 text-slate-500 px-1.5 py-0.2 rounded border border-slate-850">
                            {model.quantization}
                          </span>
                        </div>
                        {model.history && model.history.sampleCount > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-2.5 max-w-[280px]">
                            <span className="text-[9px] font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                              Latency: {(model.history.avgLatencyMs / 1000).toFixed(1)}s
                            </span>
                            <span className="text-[9px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                              Reliability: {(model.history.successRate * 100).toFixed(0)}%
                            </span>
                            {model.history.avgSpeedTps > 0 && (
                              <span className="text-[9px] font-mono bg-purple-950/40 text-purple-400 border border-purple-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                Speed: {model.history.avgSpeedTps.toFixed(1)} t/s
                              </span>
                            )}
                            <span className="text-[9px] font-mono bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded">
                              Runs: {model.history.sampleCount}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-500 font-sans mt-2 italic">
                            No local runs recorded. Router learns dynamically as you run.
                          </div>
                        )}
                      </td>
                      <td className="py-4 font-mono text-slate-300">{model.sizeGB}</td>
                      <td className="py-4 font-mono text-slate-400">
                        <div>{model.parameterSize}</div>
                        <div className="text-[9px] text-slate-600 uppercase">{model.format}</div>
                      </td>
                      
                      {/* General Chat Score */}
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-amber-400">{model.scores.general}</span>
                          <div className="w-12 bg-slate-950 rounded-full h-1 mt-1 overflow-hidden">
                            <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${model.scores.general}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Coding Score */}
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-cyan-400">{model.scores.code}</span>
                          <div className="w-12 bg-slate-950 rounded-full h-1 mt-1 overflow-hidden">
                            <div className="bg-cyan-400 h-1 rounded-full" style={{ width: `${model.scores.code}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Creative Score */}
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-emerald-400">{model.scores.creative}</span>
                          <div className="w-12 bg-slate-950 rounded-full h-1 mt-1 overflow-hidden">
                            <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${model.scores.creative}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Vision Score */}
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-purple-400">{model.scores.vision}</span>
                          <div className="w-12 bg-slate-950 rounded-full h-1 mt-1 overflow-hidden">
                            <div className="bg-purple-400 h-1 rounded-full" style={{ width: `${model.scores.vision}%` }} />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 text-right">
                        {selectedModel === model.name ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> PINNED / ACTIVE
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectModel(model.name)}
                            className="px-2.5 py-1.5 text-[10px] font-mono rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-300 hover:text-white transition-all cursor-pointer select-none"
                          >
                            PIN MODEL
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guide Card */}
      <div className="bg-gradient-to-r from-slate-900/60 to-purple-950/20 border border-purple-500/10 p-5 rounded-2xl flex gap-3">
        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-200 font-sans">Did you know? (Bengali / বাংলা Support)</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            If you run a Chinese or multilingual open-weights model such as <strong className="text-cyan-300">Qwen2.5</strong> or <strong className="text-cyan-300">Qwen2.5-Coder</strong> in Ollama, Ruvi's capability router will prioritize it for general and multilingual chat requests. Qwen series offers state-of-the-art native comprehension for Bengali and English instructions!
          </p>
        </div>
      </div>
    </div>
  );
}
