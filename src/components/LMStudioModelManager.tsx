import React, { useEffect, useState } from "react";
import { 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle, 
 
  Gauge, 
  Terminal, 
 
  Layers, 
  RefreshCw, 
  Lightbulb,
  Radio,
  Server,
 
  Cpu,
  Activity,
  Sliders,
 
  Sparkles
} from "lucide-react";

interface LMStudioModel {
  name: string;
  owned_by: string;
  history?: unknown;
}

interface LMStudioStatus {
  online: boolean;
  latency?: number;
  models: LMStudioModel[];
}

export default function LMStudioModelManager() {
  const [status, setStatus] = useState<LMStudioStatus>({ online: false, models: [] });
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hostUrl, setHostUrl] = useState<string>("http://127.0.0.1:1234/v1");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lmstudio/models");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.online && data.models.length > 0) {
          // If no model is saved in localStorage, default to the first one
          const savedModel = localStorage.getItem("ruvi_lmstudio_selected_model");
          if (savedModel && data.models.some((m: any) => m.name === savedModel)) {
            setSelectedModel(savedModel);
          } else {
            const firstModel = data.models[0].name;
            setSelectedModel(firstModel);
            localStorage.setItem("ruvi_lmstudio_selected_model", firstModel);
          }
        }
      } else {
        setStatus({ online: false, models: [] });
      }
    } catch (err) {
      console.warn("Failed to fetch LM Studio status (expected during server boot/restarts or if local client is not running):", err);
      setStatus({ online: false, models: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-reconnect scan every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectModel = (modelName: string) => {
    setSelectedModel(modelName);
    localStorage.setItem("ruvi_lmstudio_selected_model", modelName);
    // Also change the provider to lmstudio
    localStorage.setItem("ruvi_selected_provider", "lmstudio");
    
    // Play futuristic sound
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
 
    } catch (_e) { /* empty */ }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="lmstudio-model-manager">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-pink-500/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-pink-400 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              Native LM Studio Control Panel
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
            Automatically scan, connect, and stream from your local LM Studio service. Bypasses internet restrictions with ultra-low latency local inference.
          </p>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-300 transition-all cursor-pointer select-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Scanning..." : "Scan Local Server"}
        </button>
      </div>

      {/* Stats and Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection Status Card */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-pink-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Connection Parameters
              </h3>
            </div>
            
            <div className="space-y-3 font-mono text-xs text-slate-400">
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span>LM Studio Server</span>
                {status.online ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> CONNECTED
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-3 h-3 animate-pulse text-amber-500" /> DISCONNECTED
                  </span>
                )}
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50 border-dashed">
                <span>Default Endpoint</span>
                <span className="text-slate-300">{hostUrl}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50 border-dashed">
                <span>Detected Models</span>
                <span className="text-pink-400 font-bold">
                  {status.online ? `${status.models.length} Loaded` : "None"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Scan Heartbeat</span>
                <span className="text-slate-500 font-mono">Every 10s (Auto)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl">
            <div className="flex gap-2 items-start">
              <Activity className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                <strong>Zero Configuration:</strong> Start LM Studio, enable the local server option on port 1234, and Ruvi will automatically latch onto the active connection and hot-swap your model.
              </p>
            </div>
          </div>
        </div>

        {/* Model Selection Card */}
        <div className="lg:col-span-2 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Select Active Model
                </h3>
              </div>
              {status.online && (
                <span className="text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded uppercase">
                  ACTIVE FEED
                </span>
              )}
            </div>

            {status.online ? (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400 font-sans">
                  Choose which currently loaded LM Studio model should power Ruvi's brain:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {status.models.map((model) => {
                    const isSelected = selectedModel === model.name;
                    return (
                      <button
                        key={model.name}
                        onClick={() => handleSelectModel(model.name)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between items-start gap-1 cursor-pointer select-none ${
                          isSelected
                            ? "bg-pink-500/10 border-pink-500/40 text-white"
                            : "bg-slate-950/40 border-slate-800/85 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <BrainCircuit className={`w-3.5 h-3.5 ${isSelected ? "text-pink-400" : "text-slate-500"}`} />
                          <span className="text-[11px] font-mono font-medium truncate flex-1">{model.name}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">
                          Owned by: {model.owned_by || "LM Studio"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-300 font-sans">LM Studio Offline</h4>
                  <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed font-sans">
                    No active server found at <code className="bg-slate-950 px-1 py-0.5 rounded text-pink-300">http://127.0.0.1:1234</code>. Ruvi is currently falling back to secure Gemini cloud clusters.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 bg-slate-950/50 rounded-xl border border-slate-800/80 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-bold font-mono text-slate-300 uppercase">
                Active Provider Selection
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">Current Provider:</span>
              <span className="bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded text-pink-300 uppercase font-bold text-[10px]">
                {status.online ? "Local LM Studio" : "Cloud Gemini (Failsafe Fallback)"}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Guide Card */}
      <div className="bg-gradient-to-r from-slate-900/60 to-pink-950/20 border border-pink-500/10 p-5 rounded-2xl flex gap-3">
        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-200 font-sans">Quick-Start Local LM Studio Setup</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            1. Launch the **LM Studio** desktop app.<br />
            2. Navigate to the **Local Server** (Developer console icon) tab in LM Studio's sidebar.<br />
            3. Select a model to load into memory, then click **Start Server** (defaulting to port `1234`).<br />
            4. Ruvi will immediately pick up the connection, hot-reload the loaded model into its interface, and run all queries locally.
          </p>
        </div>
      </div>
    </div>
  );
}
