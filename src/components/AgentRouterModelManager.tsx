import React, { useEffect, useState } from "react";
import { 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lightbulb,
  Globe,
  Sliders,
  Key,
  Cpu,
  Sparkles
} from "lucide-react";

interface AgentRouterModel {
  id: string;
  name: string;
  description: string;
  contextLength: string;
  cost: string;
}

const CURATED_MODELS: AgentRouterModel[] = [
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    description: "Extremely fast, intelligent, and cost-effective conversational model.",
    contextLength: "64K",
    cost: "Very Low"
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1 (Reasoning)",
    description: "Advanced reasoning model using chain-of-thought processing.",
    contextLength: "160K",
    cost: "Medium"
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    description: "Meta's flagship high-intelligence open-weights instruct model.",
    contextLength: "128K",
    cost: "Low"
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "High speed, multi-modal efficiency from Google Cloud clusters.",
    contextLength: "1M",
    cost: "Low"
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "State-of-the-art reasoning, coding, and natural dialogue agent.",
    contextLength: "200K",
    cost: "High"
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (Omni)",
    description: "OpenAI's high-performance standard flagship conversational model.",
    contextLength: "128K",
    cost: "High"
  }
];

export default function AgentRouterModelManager() {
  const [configured, setConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem("ruvi_agentrouter_selected_model") || "deepseek/deepseek-chat";
  });
  const [customModel, setCustomModel] = useState<string>("");

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agentrouter/status");
      if (res.ok) {
        const data = await res.json();
        setConfigured(data.configured);
      } else {
        setConfigured(false);
      }
    } catch (err) {
      console.error("Failed to check AgentRouter status:", err);
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("ruvi_agentrouter_selected_model", modelId);
    // Switch the active provider to agentrouter
    localStorage.setItem("ruvi_selected_provider", "agentrouter");
    
    // Play sound feedback
    triggerAudioFeedback(880);
  };

  const handleApplyCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customModel.trim()) return;
    const modelId = customModel.trim();
    setSelectedModel(modelId);
    localStorage.setItem("ruvi_agentrouter_selected_model", modelId);
    localStorage.setItem("ruvi_selected_provider", "agentrouter");
    setCustomModel("");
    triggerAudioFeedback(1000);
  };

  const triggerAudioFeedback = (freq: number) => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.frequency.setValueAtTime(freq, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, context.currentTime + 0.15);
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, context.currentTime + 0.15);
      osc.start();
      osc.stop(context.currentTime + 0.15);
    } catch (_e) { /* ignored */ }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="agentrouter-model-manager">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-purple-500/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-purple-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              AgentRouter Brain Cloud Manager
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
            Connect your personal AgentRouter API Key to unlock unified, high-speed access to 30+ world-class LLMs (including DeepSeek V3, R1, Claude, and GPT-4o) with $200 free credits on sign-up.
          </p>
        </div>
        <button 
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-xl bg-purple-50/5 hover:bg-purple-500/10 border border-purple-500/20 text-purple-300 transition-all cursor-pointer select-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Verifying..." : "Refresh Status"}
        </button>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection Status Card */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                API Key Configuration
              </h3>
            </div>
            
            <div className="space-y-3 font-mono text-xs text-slate-400">
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span>AgentRouter Service</span>
                {configured ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> ACTIVE KEY
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1 font-bold animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> KEY MISSING
                  </span>
                )}
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50 border-dashed">
                <span>API Endpoint</span>
                <span className="text-slate-300">agentrouter.org/v1</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Selected Brain ID</span>
                <span className="text-purple-300 font-bold max-w-[150px] truncate" title={selectedModel}>
                  {selectedModel}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
            <div className="flex gap-2 items-start">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                {configured ? (
                  <span><strong>Keys Loaded!</strong> AgentRouter is active and fully functional. You can switch models dynamically on this panel.</span>
                ) : (
                  <span><strong>Setup Instructions:</strong> Please define <code className="bg-slate-950 px-1 py-0.5 text-pink-300 rounded">AGENTROUTER_API_KEY</code> in your environment settings. This will bypass all Gemini free tier quotas.</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Model Selector Card */}
        <div className="lg:col-span-2 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Curated AgentRouter Models
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {CURATED_MODELS.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between items-start gap-1 cursor-pointer select-none ${
                      isSelected
                        ? "bg-purple-500/10 border-purple-500/40 text-white"
                        : "bg-slate-950/40 border-slate-800/85 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <BrainCircuit className={`w-3.5 h-3.5 ${isSelected ? "text-purple-400" : "text-slate-500"}`} />
                      <span className="text-[11px] font-mono font-medium truncate flex-1">{model.name}</span>
                      <span className="text-[9px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">
                        {model.contextLength}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-normal">
                      {model.description}
                    </p>
                    <span className="text-[9px] font-mono text-purple-400 mt-1 uppercase">
                      Cost: {model.cost}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Model String Form */}
            <form onSubmit={handleApplyCustomModel} className="mt-4 pt-3 border-t border-slate-800/50 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold font-mono text-slate-300 uppercase">
                  Use Custom Model Identifier
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. mistralai/mistral-7b-instruct"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 outline-none placeholder-slate-600 transition-all"
                />
                <button
                  type="submit"
                  disabled={!customModel.trim()}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/20 disabled:text-slate-600 text-xs font-mono text-white transition-all cursor-pointer select-none"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 bg-slate-950/50 rounded-xl border border-slate-800/80 p-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">Selected Brain Core Router:</span>
              <span className="bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300 uppercase font-bold text-[10px]">
                {selectedModel}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Guide Card */}
      <div className="bg-gradient-to-r from-slate-900/60 to-purple-950/20 border border-purple-500/10 p-5 rounded-2xl flex gap-3">
        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-200 font-sans">Quick-Start AgentRouter Guide</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            1. Go to **agentrouter.org** and sign up.<br />
            2. Retrieve your free $200 API credits on registration.<br />
            3. Navigate to your dashboard and generate a new **API Key**.<br />
            4. Open the **Settings** menu here in AI Studio, click on **Secrets/Environment Variables**.<br />
            5. Add a new variable with Key: <code className="bg-slate-950 px-1 py-0.5 text-pink-300 rounded font-mono">AGENTROUTER_API_KEY</code> and paste your AgentRouter key as the value.<br />
            6. Ruvi AI Hologram will immediately route your voice and brain queries through AgentRouter, enabling incredibly fast models like DeepSeek V3 and DeepSeek R1!
          </p>
        </div>
      </div>
    </div>
  );
}
