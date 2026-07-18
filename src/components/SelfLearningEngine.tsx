import React, { useState, useEffect, useRef } from "react";
import { 
  Brain, 
  RefreshCw, 
  ShieldCheck, 
  Network, 
  Cpu, 
  Sparkles, 
  Terminal as TerminalIcon, 
  Check, 
  Loader2, 
  Zap, 
  Layers, 
  AlertTriangle, 
  RefreshCcw,
  Activity,
  ShieldAlert,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  BookOpen,
  Calendar,
  Lock,
  ArrowRight,
  TrendingUp,
  Sliders,
  History
} from "lucide-react";

interface KnowledgeItem {
  id: string;
  topic: string;
  source: string;
  evidence: string;
  date: string;
  confidenceScore: number;
  whyUseful: string;
  suggestedImprovement: string;
  status: "Learned" | "Verified" | "Needs Testing" | "Archived";
  channel?: string;
  obsoleteStatus?: "Active" | "Deprecated" | "Obsolete" | "Superseded";
  recommendedAlternative?: string;
  references?: string[];
  lastObsoleteChecked?: string;
  auditReason?: string;
  cyclesSinceUpdate?: number;
  lastUpdated?: string;
  sources?: string[];
}

interface SelfAnalysisFinding {
  id: string;
  category: 
    | "Weaknesses" 
    | "Bugs" 
    | "Missing capabilities" 
    | "Slow components" 
    | "Reliability problems" 
    | "Hallucination risks" 
    | "Security risks" 
    | "Architectural limitations";
  finding: string;
  evidence: string;
  impact: "Low" | "Medium" | "High";
  date: string;
  priorityLevel?: string;
  priorityScore?: number;
}

interface ImprovementProposal {
  id: string;
  problem: string;
  rootCause: string;
  supportingEvidence: string;
  expectedBenefit: string;
  riskAssessment: string;
  filesLikelyAffected: string[];
  estimatedComplexity: "Low" | "Medium" | "High";
  status: "Pending" | "Approved" | "Rejected" | "Executed" | "Rolled Back";
  date: string;
  priorityLevel?: string;
  priorityScore?: number;
  actionHistory?: any[];
}

interface EvolutionReport {
  id: string;
  date: string;
  summary: string;
  whatWasLearnedCount: number;
  newTechnologiesDiscovered: string[];
  weaknessesIdentified: string[];
  possibleImprovements: string[];
  confidenceLevels: Record<string, number>;
  itemsAwaitingApprovalCount: number;
}

interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  queueLength: number;
  activeRetries: number;
  backoffDelayMs: number;
  lastError: string;
  status: "Healthy" | "Rate Limited" | "Quota Exhausted" | "Degraded";
}

interface QueuedTask {
  topic: string;
  channel: string;
  timestamp: string;
}

interface SelfLearningEngineProps {
  onUpgradingChange?: (upgrading: boolean) => void;
}

// Interactive sound effects helper utilizing standard Web Audio API
const playHolographicSynthSound = (frequency: number = 800, type: "sine" | "triangle" | "sawtooth" = "sine", duration: number = 0.15) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_e) {
    // Suppress rate-limited browser audio exceptions
  }
};

export default function SelfLearningEngine({ onUpgradingChange }: SelfLearningEngineProps) {
  // Navigation tabs within Evolution Mode
  const [activeTab, setActiveTab] = useState<"map" | "proposals" | "knowledge" | "analysis" | "reports" | "audits">("map");

  // Domain knowledge, analysis, proposals fetched from server
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [findings, setFindings] = useState<SelfAnalysisFinding[]>([]);
  const [proposals, setProposals] = useState<ImprovementProposal[]>([]);
  const [reports, setReports] = useState<EvolutionReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    knowledgeCount: 0,
    findingsCount: 0,
    proposalsCount: 0,
    reportsCount: 0
  });

  const [apiMetrics, setApiMetrics] = useState<ApiMetrics>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    queueLength: 0,
    activeRetries: 0,
    backoffDelayMs: 0,
    lastError: "",
    status: "Healthy"
  });
  const [queueList, setQueueList] = useState<QueuedTask[]>([]);
  const [isEnqueueing, setIsEnqueueing] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [cycleProgress, setCycleProgress] = useState(0);
  const [cycleStep, setCycleStep] = useState("Standing By");
  const [isAuditing, setIsAuditing] = useState(false);

  // Advanced Research Engine inputs
  const [researchTopic, setResearchTopic] = useState("");
  const [researchChannel, setResearchChannel] = useState("MDN");
  const [isResearching, setIsResearching] = useState(false);

  // Advanced Obsolete Checking state
  const [isObsoleteAuditing, setIsObsoleteAuditing] = useState(false);

  // Ruvi Autonomous Auto-Learning Mode state
  const [isAutonomyActive, setIsAutonomyActive] = useState(true);
  const [autonomyStatus, setAutonomyStatus] = useState("Active & Monitoring idle status...");
  const [lastAutonomouslyResearched, setLastAutonomouslyResearched] = useState("");
  
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] Evolution Subsystem core cognitive daemon loaded.",
    "[SYSTEM] Hard Safety Protocol initialized: Autonomy restricted strictly to LEARNING.",
    "[SYSTEM] Awaiting manual or scheduled cognitive self-analysis request..."
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>("core_router");
  const [searchTerm, setSearchTerm] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Load all stats and data from API
  const loadAllData = async () => {
    try {
      const [statsRes, knowRes, findRes, propRes, repRes, auditRes, metricsRes, queueRes] = await Promise.all([
        fetch("/api/evolution/status"),
        fetch("/api/evolution/knowledge"),
        fetch("/api/evolution/analysis"),
        fetch("/api/evolution/proposals"),
        fetch("/api/evolution/reports"),
        fetch("/api/evolution/audit-logs"),
        fetch("/api/evolution/api-metrics"),
        fetch("/api/evolution/queue")
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (knowRes.ok) setKnowledge(await knowRes.json());
      if (findRes.ok) setFindings(await findRes.json());
      if (propRes.ok) setProposals(await propRes.json());
      if (repRes.ok) setReports(await repRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (metricsRes.ok) setApiMetrics(await metricsRes.json());
      if (queueRes.ok) setQueueList(await queueRes.json());
    } catch (err) {
      console.error("Failed to fetch Evolution Mode metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Refresh stats every 3s for fast, real-time feedback on queues and retries
    const interval = setInterval(loadAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update upgrading change state
  useEffect(() => {
    if (onUpgradingChange) {
      onUpgradingChange(isRunningCycle);
    }
  }, [isRunningCycle, onUpgradingChange]);

  // Predefined futuristic and critical engineering topics for independent learning
  const AUTONOMOUS_TOPICS = [
    { topic: "HTTP/3 Protocol Stream Multiplexing", channel: "RFC" },
    { topic: "SameSite Cookie Security Attributes", channel: "OWASP" },
    { topic: "WebGPU Async Pipeline Rendering", channel: "MDN" },
    { topic: "OWASP Session Fixation Attack Mitigation", channel: "OWASP" },
    { topic: "Memory Leak Diagnostics in React Hooks", channel: "MDN" },
    { topic: "CVE Remote Code Execution Vector Filter", channel: "CVE" },
    { topic: "CRDT Collaborative Real-time Mechanics", channel: "Web" },
    { topic: "Secure Sandbox Virtual Machine Execution", channel: "OWASP" },
    { topic: "AES-256 Symmetric Database Encryption", channel: "CVE" },
    { topic: "Semantic Memory Embeddings & Retrieval", channel: "Web" },
    { topic: "DDoS Mitigation Route Gatekeepers", channel: "OWASP" },
    { topic: "Vite Chunk Splitting Bundle Dividers", channel: "MDN" },
    { topic: "HTTP/2 Head-of-Line Blocking Solutions", channel: "RFC" },
    { topic: "OWASP Broken Object Level Authorization", channel: "OWASP" },
    { topic: "WebSockets Backpressure Congestion Flow", channel: "RFC" },
    { topic: "Cross-Site Scripting Sanitization Hooks", channel: "OWASP" },
    { topic: "JWT Token Expiration & Rotation Policies", channel: "OWASP" },
    { topic: "Content Security Policy Header Directives", channel: "MDN" },
    { topic: "IntersectionObserver Async Lazy Loading", channel: "MDN" },
    { topic: "Node.js ESM Relative Path Resolution", channel: "Web" },
    { topic: "IndexedDB Local Client Cache Structuring", channel: "MDN" }
  ];

  // Ruvi Autonomous Idle-Learning Loop (Fully Automatic Self-Running & Research)
  useEffect(() => {
    if (!isAutonomyActive) {
      setAutonomyStatus("Autonomous daemon disabled by operator.");
      return;
    }

    setAutonomyStatus("Monitoring system idle status...");

    const timer = setInterval(async () => {
      // Avoid running when other actions are busy
      if (isResearching || isEnqueueing || isRunningCycle || isObsoleteAuditing || isAuditing) {
        return;
      }

      // Decide which autonomous task to run
      // 60% chance: Random topic research
      // 25% chance: Full Self-Cognitive Evolution Cycle (run-cycle)
      // 15% chance: System Integrity Self-Audit & De-duplication (run-audit)
      const rand = Math.random();

      if (rand < 0.60) {
        // Option A: Specific Topic Research
        // Filter out topics already learned (case-insensitive check)
        const unstudied = AUTONOMOUS_TOPICS.filter(
          item => !knowledge.some(k => k.topic.toLowerCase() === item.topic.toLowerCase())
        );

        const pool = unstudied.length > 0 ? unstudied : AUTONOMOUS_TOPICS;
        const target = pool[Math.floor(Math.random() * pool.length)];

        if (!target) return;

        setAutonomyStatus(`Crawl active: Studying "${target.topic}"...`);
        setLastAutonomouslyResearched(target.topic);

        addLog(`[AUTONOMY] System idle state confirmed. Triggering independent background research on: "${target.topic}" via ${target.channel} channel.`);
        addLog(`[AUTONOMY] Connecting to standard Specifications & APIs to fetch standard documentation...`);
        
        try {
          const res = await fetch("/api/evolution/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: target.topic, channel: target.channel })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            addLog(`[AUTONOMY] SUCCESS: Knowledge on "${data.item.topic}" acquired with confidence ${data.item.confidenceScore}%. Status: ${data.item.obsoleteStatus}.`);
            loadAllData();
            setAutonomyStatus(`Idle learning cycle succeeded. Standing by... (Last: ${target.topic})`);
          } else {
            addLog(`[AUTONOMY] Skipping topic "${target.topic}": ${data.error || "Heuristic limit or quota threshold reached."}`);
            setAutonomyStatus("Standing by. Rate limit or quota safety guard active.");
          }
        } catch (err: any) {
          addLog(`[AUTONOMY] Skip error: ${err.message || String(err)}`);
          setAutonomyStatus("Standing by. Awaiting network retry window...");
        }
      } else if (rand < 0.85) {
        // Option B: Full Self-Cognitive Evolution Cycle (run-cycle)
        setAutonomyStatus("Autonomy Trigger: Running Self-Cognitive Evolution Cycle...");
        addLog(`[AUTONOMY] System idle state confirmed. Triggering fully autonomous Self-Cognitive Evolution Cycle to analyze codebase metrics and generate improvement proposals...`);
        
        // Call the visually integrated evolution cycle function
        runEvolutionCycle();
      } else {
        // Option C: System Integrity Self-Audit (run-audit)
        setAutonomyStatus("Autonomy Trigger: Running continuous integrity self-audit...");
        addLog(`[AUTONOMY] System idle state confirmed. Triggering continuous system integrity self-audit to evaluate knowledge aging & deduplicate databases...`);
        
        // Call the integrated self-audit function
        triggerSelfAudit();
      }
    }, 25000); // Trigger every 25s of active idle tab time

    return () => clearInterval(timer);
  }, [isAutonomyActive, knowledge, isResearching, isEnqueueing, isRunningCycle, isObsoleteAuditing, isAuditing]);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runTargetedResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchTopic.trim()) return;
    setIsResearching(true);
    addLog(`[RESEARCH ENGINE] Enqueueing target research on topic: "${researchTopic}" via ${researchChannel} channel.`);
    playHolographicSynthSound(600, "sawtooth", 0.25);

    try {
      const res = await fetch("/api/evolution/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: researchTopic, channel: researchChannel })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addLog(`[RESEARCH ENGINE] SUCCESS: Topic "${data.item.topic}" has been added to our verified knowledge database with confidence ${data.item.confidenceScore}%. Status: ${data.item.obsoleteStatus}.`);
        setResearchTopic("");
        playHolographicSynthSound(900, "sine", 0.3);
        loadAllData();
      } else {
        addLog(`[RESEARCH ENGINE] ERROR: ${data.error || "Failed to execute research target."}`);
        playHolographicSynthSound(300, "triangle", 0.4);
      }
    } catch (err: any) {
      addLog(`[RESEARCH ENGINE] ERROR: ${err.message || String(err)}`);
      playHolographicSynthSound(300, "triangle", 0.4);
    } finally {
      setIsResearching(false);
    }
  };

  const addResearchToQueue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!researchTopic.trim()) return;
    setIsEnqueueing(true);
    addLog(`[QUEUE ENGINE] Submitting "${researchTopic}" via ${researchChannel} channel to background task queue...`);
    playHolographicSynthSound(700, "triangle", 0.2);

    try {
      const res = await fetch("/api/evolution/queue/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: researchTopic, channel: researchChannel })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addLog(`[QUEUE ENGINE] SUCCESS: ${data.message}`);
        setResearchTopic("");
        playHolographicSynthSound(950, "sine", 0.25);
        loadAllData();
      } else {
        addLog(`[QUEUE ENGINE] ERROR: ${data.error || "Failed to add to queue."}`);
        playHolographicSynthSound(300, "sawtooth", 0.35);
      }
    } catch (err: any) {
      addLog(`[QUEUE ENGINE] ERROR: ${err.message || String(err)}`);
      playHolographicSynthSound(300, "sawtooth", 0.35);
    } finally {
      setIsEnqueueing(false);
    }
  };

  const runObsoleteCheck = async () => {
    setIsObsoleteAuditing(true);
    addLog("[VALIDITY CHECK] Initiating autonomous obsolescence aging evaluation across all saved items.");
    playHolographicSynthSound(500, "sine", 0.15);

    try {
      const res = await fetch("/api/evolution/obsolete-check", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addLog(`[VALIDITY CHECK] Completed. Checked ${data.checkedCount} items. Detected ${data.obsoleteCount} obsolete/deprecated entries.`);
        if (data.updatedLogs && Array.isArray(data.updatedLogs)) {
          data.updatedLogs.forEach((log: string) => addLog(log));
        }
        playHolographicSynthSound(850, "sine", 0.25);
        loadAllData();
      } else {
        addLog(`[VALIDITY CHECK] ERROR: ${data.error || "Failed to execute validation check."}`);
      }
    } catch (err: any) {
      addLog(`[VALIDITY CHECK] ERROR: ${err.message || String(err)}`);
    } finally {
      setIsObsoleteAuditing(false);
    }
  };

  // Run autonomous analysis cycle
  const runEvolutionCycle = async () => {
    if (isRunningCycle) return;
    setIsRunningCycle(true);
    setCycleProgress(5);
    setCycleStep("Initializing Core");
    playHolographicSynthSound(440, "sawtooth", 0.3);

    setTerminalLogs([
      `[${new Date().toLocaleTimeString()}] [EVOLUTION] Launching cognitive evolution sequence...`,
      `[${new Date().toLocaleTimeString()}] [SECURITY] Enforcing Hard Sandbox Safety: Code compilation / execution modification disabled.`
    ]);

    // Fast-loading simulated steps while backend executes
    const steps = [
      { text: "Scanning server-side files & router endpoints...", progress: 20, delay: 600 },
      { text: "Evaluating bundle modularity parameters of src/App.tsx...", progress: 40, delay: 1400 },
      { text: "Heuristically auditing ToolsRegistration loop operations...", progress: 60, delay: 2200 },
      { text: "Checking for API endpoint security & rate-limiting guards...", progress: 80, delay: 3000 },
      { text: "Ingesting academic papers & best-practice sources...", progress: 95, delay: 4000 }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setCycleProgress(step.progress);
        setCycleStep(step.text);
        addLog(`[COGNITION] ${step.text}`);
        playHolographicSynthSound(440 + step.progress * 4, "sine", 0.08);
      }, step.delay);
    });

    try {
      const res = await fetch("/api/evolution/run-cycle", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTimeout(() => {
          setCycleProgress(100);
          setCycleStep("Synthesis Finalized");
          addLog(`[SUCCESS] Evolution research cycle finalized: Ingested ${data.report?.whatWasLearnedCount || 0} items.`);
          addLog(`[REPORT] Summary: ${data.report?.summary}`);
          playHolographicSynthSound(1000, "sine", 0.5);
          setIsRunningCycle(false);
          loadAllData();
        }, 4500);
      } else {
        const errData = await res.json();
        addLog(`[ERROR] Evolution cycle backend failed: ${errData.error}`);
        setIsRunningCycle(false);
      }
    } catch (err: any) {
      addLog(`[ERROR] Connection failed: ${err.message || String(err)}`);
      setIsRunningCycle(false);
    }
  };

  // Run continuous self-audit
  const triggerSelfAudit = async () => {
    if (isAuditing) return;
    setIsAuditing(true);
    addLog("[AUDIT] Running continuous system self-audit daemon...");
    playHolographicSynthSound(550, "triangle", 0.2);

    try {
      const res = await fetch("/api/evolution/run-audit", { method: "POST" });
      if (res.ok) {
        const log = await res.json();
        addLog(`[SUCCESS] Self-audit completed. Integrity: ${log.integrityOk ? "PASS" : "FAIL"}. Duplicates merged: ${log.duplicatesRemovedCount}. Aged knowledge count: ${log.agedItemsCount}.`);
        if (log.issuesFound && log.issuesFound.length > 0) {
          log.issuesFound.forEach((issue: string) => addLog(`[AUDIT WARNING] ${issue}`));
        }
        loadAllData();
      } else {
        addLog("[ERROR] Continuous self-audit backend failed.");
      }
    } catch (err: any) {
      addLog(`[ERROR] Self-audit failed: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // Proposal State Changers
  const handleProposalAction = async (id: string, action: "approve" | "reject" | "execute" | "rollback", note?: string) => {
    try {
      playHolographicSynthSound(action === "approve" || action === "execute" ? 800 : 350, "sine", 0.25);
      const res = await fetch(`/api/evolution/proposals/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note })
      });
      if (res.ok) {
        addLog(`[PROPOSAL] Marked proposal ${id} as ${action.toUpperCase()}D.`);
        loadAllData();
      } else {
        addLog(`[ERROR] Failed to modify proposal state: ${(await res.json()).error}`);
      }
    } catch (err: any) {
      addLog(`[ERROR] Connection failure: ${err.message}`);
    }
  };

  // Knowledge State Changers
  const handleKnowledgeAction = async (id: string, action: "verify" | "archive") => {
    try {
      playHolographicSynthSound(action === "verify" ? 900 : 300, "sine", 0.2);
      const res = await fetch(`/api/evolution/knowledge/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        addLog(`[KNOWLEDGE] Ingested state changed to ${action.toUpperCase()} for item: ${id}`);
        loadAllData();
      } else {
        addLog(`[ERROR] Failed to update knowledge state.`);
      }
    } catch (err: any) {
      addLog(`[ERROR] Connection failure: ${err.message}`);
    }
  };

  // Visual Node Setup for Synapse Map
  const brainNodes = [
    { id: "core_router", name: "Ruvi Cognitive Router", category: "Orchestration", status: "Active", x: 400, y: 200, color: "from-cyan-500 to-blue-600 shadow-cyan-500/50", glowColor: "#00f2fe", desc: "Main gateway directing LLM inferences, system metrics, and self-analysis evaluations." },
    { id: "app_density", name: "UI Architecture Hub", category: "App Structure", status: "Needs Modularity", x: 200, y: 110, color: "from-amber-400 to-orange-500 shadow-amber-500/50", glowColor: "#f59e0b", desc: "Analyzes react component file size limitations, token-limit bottlenecks, and HMR stability thresholds." },
    { id: "sync_io", name: "Blocking I/O Scanner", category: "Server Latency", status: "Heuristic Alert", x: 200, y: 290, color: "from-rose-400 to-red-500 shadow-rose-500/50", glowColor: "#f43f5e", desc: "Identifies synchronous filesystem blocks in core routing loops that throttle request concurrency." },
    { id: "rate_limiting", name: "Security Gatekeeper", category: "Vulnerability Check", status: "Risk Identified", x: 600, y: 110, color: "from-purple-400 to-indigo-500 shadow-purple-500/50", glowColor: "#a855f7", desc: "Monitors lack of API rate-limiting or DDoS security guards in Express routes." },
    { id: "gemini_cognitive", name: "Gemini Reasoning Core", category: "AI Orchestrator", status: "Synced", x: 600, y: 290, color: "from-emerald-400 to-teal-500 shadow-emerald-500/50", glowColor: "#10b981", desc: "Proxies all server-side deep learning processes, codebase auditing, and proposal compilation." },
  ];

  const brainConnections = [
    { id: "c1", source: "core_router", target: "app_density", label: "AST Audit Pipeline" },
    { id: "c2", source: "core_router", target: "sync_io", label: "CPU Thread Block Scan" },
    { id: "c3", source: "core_router", target: "rate_limiting", label: "Security Risk Guard" },
    { id: "c4", source: "core_router", target: "gemini_cognitive", label: "AI Analysis Bridge" },
  ];

  const activeNodeData = brainNodes.find(n => n.id === selectedNodeId) || brainNodes[0];

  // Filters
  const filteredKnowledge = knowledge.filter(k => 
    k.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
    k.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProposals = proposals.filter(p => 
    p.problem.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.rootCause.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFindings = findings.filter(f => 
    f.finding.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="evolution-mode-container" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Permanent Header Warning Rule */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/30">
            <ShieldCheck className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase font-extrabold tracking-widest text-cyan-400">CORE COGNITIVE RULE</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase">SECURE</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-sans mt-0.5">
              <span className="font-semibold text-white">"Ruvi may evolve forever. Ruvi may never change itself without explicit user approval."</span> Learning is completely autonomous, but codebase modification requires direct operator permission.
            </p>
          </div>
        </div>
        <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 uppercase shrink-0">
          Evolution: <span className="text-emerald-400 font-bold">READY</span>
        </div>
      </div>

      {/* Dynamic Subsystem Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Control & Status */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-fuchsia-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(217,70,239,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-fuchsia-500/10 pb-2">
              <Cpu className="w-5 h-5 text-fuchsia-400 animate-pulse" />
              <h2 className="font-sans font-bold text-sm tracking-wider text-fuchsia-300 uppercase">Autonomous Evolution</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">LEARNING STATUS</span>
                <span className="text-xs bg-fuchsia-500/10 text-fuchsia-400 font-mono font-bold px-2 py-0.5 rounded border border-fuchsia-500/20 uppercase tracking-wider">
                  Allowed Indefinitely
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">COGNITIVE ENGINE</span>
                <span className="text-xs flex items-center gap-1.5 font-mono text-emerald-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunningCycle ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
                  {isRunningCycle ? "Analyzing Codebase..." : "Standby (Ready to Learn)"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">INGESTION RATINGS</span>
                <span className="text-xs text-cyan-400 font-mono font-bold">
                  {stats.knowledgeCount} Learned / {stats.proposalsCount} Proposals
                </span>
              </div>
            </div>

            {isRunningCycle && (
              <div className="mt-5 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-[150px]">{cycleStep}...</span>
                  <span>{cycleProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(236,72,153,0.5)]" 
                    style={{ width: `${cycleProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={runEvolutionCycle}
              disabled={isRunningCycle}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border ${
                isRunningCycle
                  ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 hover:from-cyan-500/35 hover:to-fuchsia-500/35 text-white border-fuchsia-500/40 hover:border-fuchsia-400 cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.15)]"
              }`}
            >
              {isRunningCycle ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                  Running Scan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  Run Evolution Cycle
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Evolution Console */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.05)] lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-500/10 pb-2">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-5 h-5 text-cyan-400 animate-pulse" />
              <h2 className="font-sans font-bold text-sm tracking-wider text-cyan-300 uppercase">Evolution Output Console</h2>
            </div>
            <button 
              onClick={() => {
                setTerminalLogs([`[${new Date().toLocaleTimeString()}] [SYSTEM] Console logs buffer cleared.`]);
              }}
              className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors uppercase"
            >
              Clear
            </button>
          </div>

          <div className="bg-slate-950/90 rounded-xl border border-slate-800/80 p-3 h-[180px] overflow-y-auto font-mono text-[10px] text-cyan-400/90 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
            {terminalLogs.map((log, index) => (
              <div 
                key={index} 
                className={`${
                  log.includes("[SUCCESS]") ? "text-emerald-400 font-medium" :
                  log.includes("[ERROR]") ? "text-rose-400 font-bold" :
                  log.includes("[SECURITY]") ? "text-fuchsia-400 font-semibold" :
                  log.includes("[COGNITION]") ? "text-cyan-300" :
                  log.includes("[AUTONOMY]") ? "text-fuchsia-400 font-bold" :
                  log.includes("[RESEARCH ENGINE]") ? "text-violet-400 font-medium" :
                  "text-slate-400"
                }`}
              >
                {log}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Real-time Web Crawler & Autonomous Study HUD */}
          <div className="mt-3 bg-fuchsia-950/20 border border-fuchsia-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-[11px] shadow-[0_0_15px_rgba(217,70,239,0.05)]">
            <div className="flex items-center gap-2.5 truncate">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75 ${isAutonomyActive ? "" : "hidden"}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isAutonomyActive ? "bg-fuchsia-500 animate-pulse" : "bg-slate-600"}`} />
              </span>
              <div className="truncate">
                <span className="text-fuchsia-400/90 font-bold uppercase tracking-wider text-[8px] block">REAL-TIME DAEMON STREAM</span>
                <span className="text-slate-200 truncate font-semibold block">
                  {isAutonomyActive ? autonomyStatus : "Autonomy idle daemon offline. Enable via toggle below."}
                </span>
              </div>
            </div>
            {lastAutonomouslyResearched && (
              <span className="bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 px-2 py-0.5 rounded text-[9px] uppercase tracking-wide shrink-0">
                LATEST: {lastAutonomouslyResearched}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Main Feature Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex items-center gap-2 py-2.5 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "map" 
              ? "border-cyan-500 text-white font-bold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Network className="w-4 h-4" /> Cognitive Map
        </button>
        <button
          onClick={() => setActiveTab("proposals")}
          className={`flex items-center gap-2 py-2.5 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 relative ${
            activeTab === "proposals" 
              ? "border-amber-500 text-white font-bold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders className="w-4 h-4" /> Proposals
          {proposals.filter(p => p.status === "Pending").length > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 py-2.5 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "knowledge" 
              ? "border-fuchsia-500 text-white font-bold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" /> Ingested Knowledge
        </button>
        <button
          onClick={() => setActiveTab("analysis")}
          className={`flex items-center gap-2 py-2.5 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "analysis" 
              ? "border-rose-500 text-white font-bold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Self Analysis
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 py-2.5 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "reports" 
              ? "border-emerald-500 text-white font-bold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" /> Reports
        </button>
        <button
          onClick={() => setActiveTab("audits")}
          className={`flex items-center gap-2 py-2.5 px-4 font-mono text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "audits" 
              ? "border-indigo-500 text-white font-bold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" /> Continuous Self-Audit
        </button>

        {activeTab !== "map" && (
          <div className="ml-auto flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input 
              type="text" 
              placeholder="Search specs / evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-[11px] font-mono outline-none text-slate-300 w-full placeholder-slate-600"
            />
          </div>
        )}
      </div>

      {/* Feature Content Rendering */}
      {activeTab === "map" && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_25px_rgba(0,242,254,0.05)] relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
            {/* SVG Interactive Map (8 cols) */}
            <div className="lg:col-span-8 bg-slate-950/80 rounded-xl border border-slate-800 p-2 relative overflow-hidden aspect-[8/4] flex items-center justify-center">
              <svg viewBox="0 0 800 400" className="w-full h-full select-none">
                {/* mesh lines */}
                <line x1="200" y1="110" x2="600" y2="110" stroke="#00f2fe" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="3 3" />
                <line x1="200" y1="290" x2="600" y2="290" stroke="#00f2fe" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="3 3" />
                <line x1="200" y1="110" x2="200" y2="290" stroke="#00f2fe" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="3 3" />
                <line x1="600" y1="110" x2="600" y2="290" stroke="#00f2fe" strokeWidth="0.5" strokeOpacity="0.08" strokeDasharray="3 3" />

                {/* Connections */}
                {brainConnections.map((conn) => {
                  const target = brainNodes.find(n => n.id === conn.target);
                  if (!target) return null;
                  const isSelected = selectedNodeId === conn.target || selectedNodeId === "core_router";
                  return (
                    <g key={conn.id}>
                      <line 
                        x1="400" y1="200" 
                        x2={target.x} y2={target.y} 
                        stroke={isSelected ? "#22d3ee" : "#334155"} 
                        strokeWidth={isSelected ? 1.5 : 1}
                        strokeOpacity={isSelected ? 0.6 : 0.25}
                        className="transition-all duration-300"
                      />
                      <circle r="2.5" fill={isSelected ? "#22d3ee" : "#38bdf8"} opacity="0.8">
                        <animateMotion 
                          dur={`${isRunningCycle ? 0.8 : 3}s`} 
                          repeatCount="indefinite" 
                          path={`M 400,200 L ${target.x},${target.y}`} 
                        />
                      </circle>
                    </g>
                  );
                })}

                {/* Nodes */}
                {brainNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const Icon = node.id === "core_router" ? Brain : node.id === "app_density" ? Layers : node.id === "sync_io" ? AlertTriangle : node.id === "rate_limiting" ? ShieldAlert : Sparkles;
                  return (
                    <g 
                      key={node.id} 
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer group"
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        playHolographicSynthSound(isSelected ? 600 : 800, "sine", 0.12);
                      }}
                    >
                      <circle 
                        r={node.id === "core_router" ? 22 : 16} 
                        fill="#020617" 
                        stroke={isSelected ? "#22d3ee" : "#1e293b"} 
                        strokeWidth={1.5}
                        className="transition-all duration-300 group-hover:stroke-cyan-400"
                      />
                      <foreignObject 
                        x={node.id === "core_router" ? -10 : -8} 
                        y={node.id === "core_router" ? -10 : -8} 
                        width={node.id === "core_router" ? 20 : 16} 
                        height={node.id === "core_router" ? 20 : 16}
                      >
                        <Icon className={`w-full h-full ${isSelected ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                      </foreignObject>
                      <text y={node.y > 200 ? 32 : -25} textAnchor="middle" className={`font-mono text-[9px] uppercase ${isSelected ? "fill-cyan-400 font-bold animate-pulse" : "fill-slate-400"}`}>
                        {node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Spec Panel (4 cols) */}
            <div className="lg:col-span-4 bg-slate-950/80 rounded-xl border border-slate-800 p-4.5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-mono text-xs font-semibold text-slate-300 uppercase">Synapse Spec</span>
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase font-bold tracking-wider">
                    Node Stats
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                    <div>
                      <h3 className="font-bold text-white tracking-wider text-xs">{activeNodeData.name}</h3>
                      <span className="text-[9px] text-slate-500 uppercase">{activeNodeData.category}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/40 border border-slate-900 rounded-lg p-2.5 font-sans">
                    {activeNodeData.desc}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-900 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Node Status:</span>
                      <span className="text-cyan-400 font-bold">{activeNodeData.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Autonomous Link:</span>
                      <span className="text-emerald-400">Verifiable</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-900">
                <button 
                  onClick={() => {
                    playHolographicSynthSound(900, "sawtooth", 0.15);
                    addLog(`[STIMULUS] Dispatched verification probe to node: ${activeNodeData.id}`);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/30 text-slate-300 hover:text-white font-mono text-[10px] rounded-lg transition-all uppercase cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> Verify Subsystem Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposals Tab */}
      {activeTab === "proposals" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
            <div>
              <h3 className="font-sans font-bold text-sm text-white">Improvement Proposals</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Continuous integration recommendations generated autonomously.</p>
            </div>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-[10px] px-2.5 py-1 rounded-full uppercase shrink-0">
              {filteredProposals.length} Total
            </span>
          </div>

          {filteredProposals.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <Sliders className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-sans font-medium">No pending proposals available.</p>
              <p className="text-xs text-slate-500 font-mono mt-1">Run an evolution cycle above to detect potential improvements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProposals.map((prop) => (
                <div 
                  key={prop.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          prop.status === "Pending" ? "bg-amber-400 animate-pulse" :
                          prop.status === "Approved" ? "bg-cyan-400" :
                          prop.status === "Rejected" ? "bg-rose-500" :
                          prop.status === "Rolled Back" ? "bg-indigo-500" : "bg-emerald-500"
                        }`} />
                        <h4 className="font-sans font-extrabold text-sm text-white">{prop.problem}</h4>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase">Proposal ID: {prop.id} • Registered {prop.date}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {prop.priorityLevel && (
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                          prop.priorityLevel === "Critical" ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)]" :
                          prop.priorityLevel === "High" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                          prop.priorityLevel === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          Priority {prop.priorityLevel} ({prop.priorityScore || 0})
                        </span>
                      )}
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                        prop.estimatedComplexity === "High" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        prop.estimatedComplexity === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      } uppercase`}>
                        {prop.estimatedComplexity} Complexity
                      </span>
                      <span className="text-[10px] bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-800 font-mono text-slate-400 uppercase">
                        {prop.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Root Cause Analysis</span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">{prop.rootCause}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Real-world Supporting Evidence</span>
                        <p className="text-slate-400 mt-0.5 font-mono text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 border-l-2 border-l-cyan-500">{prop.supportingEvidence}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Expected Improvement Benefits</span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">{prop.expectedBenefit}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Associated Risks & Rollback Potential</span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">{prop.riskAssessment}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action and Audit History Timeline */}
                  {prop.actionHistory && prop.actionHistory.length > 0 && (
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-900/60 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-900/40">
                        <History className="w-3.5 h-3.5 text-slate-500" /> Action & Audit History
                      </div>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {prop.actionHistory.map((hist: any, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-[10.5px] font-mono leading-tight">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1 shrink-0" />
                            <div className="flex-1">
                              <div className="flex justify-between items-center text-[9px] text-slate-500">
                                <span className="font-bold text-slate-400 uppercase">{hist.action}</span>
                                <span>{hist.timestamp}</span>
                              </div>
                              {hist.note && <p className="text-slate-300 mt-0.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-900/40 font-sans">{hist.note}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Target Files:</span>
                        {prop.filesLikelyAffected.map((file, i) => (
                          <span key={i} className="font-mono text-[10px] bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {file}
                          </span>
                        ))}
                      </div>

                      {/* Comment Input Field */}
                      {prop.status !== "Rejected" && prop.status !== "Rolled Back" && (
                        <div className="w-full sm:w-72">
                          <input 
                            type="text" 
                            placeholder="Add audit note or comment..."
                            value={actionNote[prop.id] || ""}
                            onChange={(e) => setActionNote(prev => ({ ...prev, [prop.id]: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500/50 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 outline-none transition-all placeholder-slate-600"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                      {prop.status === "Pending" && (
                        <>
                          <button
                            onClick={() => {
                              handleProposalAction(prop.id, "reject", actionNote[prop.id]);
                              setActionNote(prev => ({ ...prev, [prop.id]: "" }));
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-mono rounded-lg transition-all cursor-pointer uppercase"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => {
                              handleProposalAction(prop.id, "approve", actionNote[prop.id]);
                              setActionNote(prev => ({ ...prev, [prop.id]: "" }));
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3.5 bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 hover:text-white text-xs font-mono rounded-lg transition-all cursor-pointer uppercase shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                        </>
                      )}

                      {prop.status === "Approved" && (
                        <>
                          <button
                            onClick={() => {
                              handleProposalAction(prop.id, "execute", actionNote[prop.id]);
                              setActionNote(prev => ({ ...prev, [prop.id]: "" }));
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3.5 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 hover:text-white text-xs font-mono rounded-lg transition-all cursor-pointer uppercase"
                          >
                            <Check className="w-3.5 h-3.5" /> Execute
                          </button>
                          <button
                            onClick={() => {
                              handleProposalAction(prop.id, "rollback", actionNote[prop.id]);
                              setActionNote(prev => ({ ...prev, [prop.id]: "" }));
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3.5 border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 hover:text-white text-xs font-mono rounded-lg transition-all cursor-pointer uppercase"
                          >
                            <RefreshCcw className="w-3.5 h-3.5" /> Rollback Approved
                          </button>
                        </>
                      )}

                      {prop.status === "Executed" && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              handleProposalAction(prop.id, "rollback", actionNote[prop.id]);
                              setActionNote(prev => ({ ...prev, [prop.id]: "" }));
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-1.5 px-3.5 border border-indigo-500/40 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-xs font-mono rounded-lg transition-all cursor-pointer uppercase"
                          >
                            <RefreshCcw className="w-3.5 h-3.5" /> Rollback Execution
                          </button>
                          <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 uppercase bg-emerald-500/10 px-2.5 py-1.5 rounded border border-emerald-500/20">
                            <Check className="w-3.5 h-3.5" /> System Updated Successfully
                          </div>
                        </div>
                      )}

                      {prop.status === "Rejected" && (
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 uppercase bg-slate-950 px-2.5 py-1.5 rounded border border-slate-900">
                          <XCircle className="w-3.5 h-3.5 text-slate-600" /> Proposal Dismissed
                        </div>
                      )}

                      {prop.status === "Rolled Back" && (
                        <div className="text-[10px] font-mono text-indigo-400 flex items-center gap-1 uppercase bg-indigo-500/10 px-2.5 py-1.5 rounded border border-indigo-500/20">
                          <RefreshCcw className="w-3.5 h-3.5 text-indigo-500 animate-spin" /> Rolled Back to Safe State
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ingested Knowledge Tab */}
      {activeTab === "knowledge" && (
        <div className="space-y-6">
          {/* Advanced Research Engine & Obsolescence Controls Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            {/* Left: Targeted Research Form */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-fuchsia-400 animate-pulse" />
                <div>
                  <h3 className="font-sans font-extrabold text-sm text-white">Targeted Research Engine</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Run dynamic real-time specifications & standards research via secure search grounding.</p>
                </div>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <input 
                      type="text" 
                      placeholder="Enter topic (e.g. WebGPU, HTTP/3, CVE-2021-44228, OWASP SSRF)..."
                      value={researchTopic}
                      onChange={(e) => setResearchTopic(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-fuchsia-500/50 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 outline-none transition-all placeholder-slate-600"
                      disabled={isResearching || isEnqueueing}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <select
                      value={researchChannel}
                      onChange={(e) => setResearchChannel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-fuchsia-500/50 rounded-xl px-2 py-2 text-xs font-mono text-slate-300 outline-none transition-all cursor-pointer"
                      disabled={isResearching || isEnqueueing}
                    >
                      <option value="MDN">MDN (Specs)</option>
                      <option value="RFC">RFC (Protocols)</option>
                      <option value="GitHub">GitHub</option>
                      <option value="CVE">CVE (Sec)</option>
                      <option value="OWASP">OWASP</option>
                      <option value="Web">General Web</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={runTargetedResearch}
                    disabled={isResearching || isEnqueueing || !researchTopic.trim()}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-fuchsia-500/20 border border-fuchsia-500/40 hover:bg-fuchsia-500/35 text-fuchsia-300 hover:text-white text-xs font-mono rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-fuchsia-500/20 cursor-pointer uppercase shadow-[0_0_15px_rgba(217,70,239,0.1)]"
                  >
                    {isResearching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-400" /> Direct Querying...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" /> Direct Search
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => addResearchToQueue()}
                    disabled={isResearching || isEnqueueing || !researchTopic.trim()}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/35 text-cyan-300 hover:text-white text-xs font-mono rounded-xl transition-all disabled:opacity-50 cursor-pointer uppercase"
                  >
                    {isEnqueueing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> Enqueueing...
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5 text-cyan-400" /> Add to Queue
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Stacked Controls for Obsolescence & Autonomy */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Obsolescence Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-3 flex flex-col justify-between flex-1">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white font-sans uppercase tracking-wider">Obsolescence Lifecycle Aging</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Learn today, review tomorrow. Checks for obsolete library components, deprecated specs, and superseded methodologies.
                  </p>
                </div>

                <button
                  onClick={runObsoleteCheck}
                  disabled={isObsoleteAuditing || knowledge.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 hover:text-white text-xs font-mono rounded-lg transition-all disabled:opacity-50 cursor-pointer uppercase"
                >
                  {isObsoleteAuditing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> auditing specifications...
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5" /> Evaluate Knowledge Obsolescence
                    </>
                  )}
                </button>
              </div>

              {/* Ruvi Autonomous Learning Daemon Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-3 flex flex-col justify-between flex-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                      <h4 className="text-xs font-bold text-white font-sans uppercase tracking-wider">Autonomous Learn Daemon</h4>
                    </div>
                    {/* Pulsing Toggle switch */}
                    <button 
                      onClick={() => {
                        setIsAutonomyActive(!isAutonomyActive);
                        addLog(`[AUTONOMY] Operator updated autonomy setting to: ${!isAutonomyActive ? "ENABLED" : "DISABLED"}`);
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isAutonomyActive ? 'bg-fuchsia-500' : 'bg-slate-800'
                      }`}
                    >
                      <span className="sr-only">Toggle Autonomy</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isAutonomyActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Runs in the background to search web specs, crawl vulnerability indexes, and expand knowledge automatically.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-900/80 p-2.5 rounded-lg flex items-center justify-between gap-3 font-mono text-[10px]">
                  <div className="truncate space-y-0.5">
                    <span className="text-slate-500 uppercase tracking-wider block text-[8px]">Daemon Status</span>
                    <span className={`font-bold truncate block ${isAutonomyActive ? 'text-fuchsia-400' : 'text-slate-600'}`}>
                      {autonomyStatus}
                    </span>
                  </div>
                  {isAutonomyActive && (
                    <span className="flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Spectacular API Quota & Task Queue Dashboard */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <Network className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-sans font-extrabold text-sm text-white uppercase tracking-wider">API Quota & Queue Monitor</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Real-time telemetry of API rate limits, exponential backoff, and FIFO processing cycles.</p>
                </div>
              </div>

              {/* Status Pill with Glow */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono uppercase">API Connection State:</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border animate-pulse ${
                  apiMetrics.status === "Healthy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                  apiMetrics.status === "Rate Limited" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                  apiMetrics.status === "Quota Exhausted" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                  "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    apiMetrics.status === "Healthy" ? "bg-emerald-400" :
                    apiMetrics.status === "Rate Limited" ? "bg-amber-400" :
                    apiMetrics.status === "Quota Exhausted" ? "bg-red-400" :
                    "bg-yellow-400"
                  }`} />
                  {apiMetrics.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Telemetry Numbers (7 cols) */}
              <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Total Requests</span>
                  <div className="text-lg font-mono font-bold text-slate-100">{apiMetrics.totalRequests}</div>
                </div>

                <div className="bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Successful</span>
                  <div className="text-lg font-mono font-bold text-emerald-400">{apiMetrics.successfulRequests}</div>
                </div>

                <div className="bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Rate Limit Hits</span>
                  <div className="text-lg font-mono font-bold text-amber-400">{apiMetrics.rateLimitHits}</div>
                </div>

                <div className="bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Failed / Fallbacks</span>
                  <div className="text-lg font-mono font-bold text-rose-400">{apiMetrics.failedRequests}</div>
                </div>

                {/* Second row of telemetry details */}
                <div className="col-span-2 bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Active Retries</span>
                    <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                      {apiMetrics.activeRetries > 0 ? `Attempt ${apiMetrics.activeRetries}/4` : "0 Active Retries"}
                    </div>
                  </div>
                  {apiMetrics.activeRetries > 0 && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                  )}
                </div>

                <div className="col-span-2 bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">Backoff Penalty Delay</span>
                    <div className="text-sm font-mono font-bold text-cyan-400 mt-0.5">
                      {apiMetrics.backoffDelayMs > 0 ? `${(apiMetrics.backoffDelayMs / 1000).toFixed(1)}s Delay` : "0.0s Idle"}
                    </div>
                  </div>
                  {apiMetrics.backoffDelayMs > 0 && (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  )}
                </div>

                {/* Error log segment */}
                {apiMetrics.lastError && (
                  <div className="col-span-2 sm:col-span-4 bg-rose-500/5 p-3 border border-rose-500/20 rounded-xl space-y-1">
                    <span className="text-[9px] font-mono text-rose-400 uppercase tracking-wider block font-bold">Last API Exception Log</span>
                    <p className="text-[10px] font-mono text-rose-300/90 truncate leading-relaxed">
                      {apiMetrics.lastError}
                    </p>
                  </div>
                )}
              </div>

              {/* Background Queue Items List (5 cols) */}
              <div className="md:col-span-5 bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[180px]">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-300 uppercase tracking-wider font-bold">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> FIFO Processing Queue
                  </div>
                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-mono px-2 py-0.5 rounded">
                    {queueList.length} Pending
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                  {queueList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                      <Zap className="w-5 h-5 text-slate-600 mb-1 animate-pulse" />
                      <p className="text-[10px] font-mono uppercase tracking-wide">Background Queue Is Empty</p>
                      <p className="text-[9px] text-slate-600">Tasks process with 1800ms rate protection.</p>
                    </div>
                  ) : (
                    queueList.map((task, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-2 rounded-lg border border-slate-900/80 flex justify-between items-center gap-2">
                        <div className="truncate">
                          <div className="text-[10.5px] font-mono font-bold text-slate-200 truncate">{task.topic}</div>
                          <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>Channel: {task.channel}</span>
                            <span>•</span>
                            <span>{new Date(task.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          idx === 0 
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                            : "bg-slate-900 text-slate-500 border border-slate-800"
                        }`}>
                          {idx === 0 ? "Processing" : "Queued"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Knowledge base stats heading */}
          <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
            <div>
              <h3 className="font-sans font-bold text-sm text-white">Ingested Knowledge Base</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Verified web-standard rules, optimizations, and academic frameworks learned.</p>
            </div>
            <span className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 font-mono text-[10px] px-2.5 py-1 rounded-full uppercase shrink-0">
              {filteredKnowledge.length} Topics
            </span>
          </div>

          {filteredKnowledge.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-sans font-medium">No knowledge articles ingested yet.</p>
              <p className="text-xs text-slate-500 font-mono mt-1">Run an evolution cycle or trigger targeted research above to index development docs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredKnowledge.map((item) => (
                <div 
                  key={item.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {(item.sources || [item.source]).map((src: string, idx: number) => (
                            <span key={idx} className="text-[9px] font-mono text-fuchsia-400 bg-fuchsia-500/5 border border-fuchsia-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {src}
                            </span>
                          ))}
                          {item.channel && (
                            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {item.channel}
                            </span>
                          )}
                          {item.obsoleteStatus && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                              item.obsoleteStatus === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              item.obsoleteStatus === "Deprecated" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              item.obsoleteStatus === "Obsolete" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            }`}>
                              Status: {item.obsoleteStatus}
                            </span>
                          )}
                        </div>
                        <h4 className="font-sans font-bold text-sm text-white">{item.topic}</h4>
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                        item.status === "Verified" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        item.status === "Archived" ? "bg-slate-800/40 text-slate-500 border-slate-800" :
                        item.status === "Needs Testing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-sans">
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Evidentiary Finding</span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">{item.evidence}</p>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Why Useful</span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">{item.whyUseful}</p>
                      </div>

                      {item.recommendedAlternative && item.recommendedAlternative !== "N/A" && (
                        <div className="bg-fuchsia-950/20 p-2.5 rounded-lg border border-fuchsia-900/30">
                          <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-wider block">Recommended Modern Alternative</span>
                          <p className="text-fuchsia-300 mt-0.5 leading-relaxed font-bold">{item.recommendedAlternative}</p>
                        </div>
                      )}

                      {item.auditReason && (
                        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 font-mono text-[10.5px]">
                          <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Obsolescence Evaluation Reason</span>
                          <p className="text-slate-400">{item.auditReason}</p>
                        </div>
                      )}

                      {item.references && item.references.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Channel Reference Links</span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.references.map((refUrl, idx) => (
                              <a 
                                key={idx}
                                href={refUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/40 truncate max-w-[240px] hover:underline"
                              >
                                {refUrl}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        <span className="font-mono text-[10px] text-slate-400">Confidence Match: <span className="text-cyan-400 font-bold">{item.confidenceScore}%</span></span>
                      </div>
                      {(item.cyclesSinceUpdate !== undefined || item.lastUpdated || item.lastObsoleteChecked) && (
                        <div className="text-[9px] font-mono text-slate-500 flex flex-wrap gap-x-2">
                          {item.cyclesSinceUpdate !== undefined && (
                            <span>Aging: {item.cyclesSinceUpdate} cycle{item.cyclesSinceUpdate !== 1 ? "s" : ""}</span>
                          )}
                          {item.lastUpdated && (
                            <span>Audited: {item.lastUpdated}</span>
                          )}
                          {item.lastObsoleteChecked && (
                            <span>Validity Checked: {item.lastObsoleteChecked}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 shrink-0 self-end">
                      {item.status === "Learned" && (
                        <>
                          <button
                            onClick={() => handleKnowledgeAction(item.id, "archive")}
                            className="py-1 px-2.5 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 font-mono text-[9px] rounded uppercase transition-all cursor-pointer"
                          >
                            Archive
                          </button>
                          <button
                            onClick={() => handleKnowledgeAction(item.id, "verify")}
                            className="py-1 px-2.5 bg-fuchsia-500/15 border border-fuchsia-500/30 hover:bg-fuchsia-500/25 text-fuchsia-300 font-mono text-[9px] rounded uppercase transition-all cursor-pointer"
                          >
                            Verify Link
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Self Analysis Tab */}
      {activeTab === "analysis" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
            <div>
              <h3 className="font-sans font-bold text-sm text-white">System Self-Analysis</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Identified codebase bugs, structural weaknesses, or capability shortfalls.</p>
            </div>
            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono text-[10px] px-2.5 py-1 rounded-full uppercase shrink-0">
              {filteredFindings.length} Alerts
            </span>
          </div>

          {filteredFindings.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-slate-400 font-sans font-medium">All systems within nominal parameters.</p>
              <p className="text-xs text-slate-500 font-mono mt-1">No security risks or architectural weaknesses logged.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFindings.map((find) => (
                <div 
                  key={find.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[9px] text-rose-400 uppercase tracking-wider">{find.category}</span>
                        <h4 className="font-sans font-bold text-sm text-white">{find.finding}</h4>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                          find.impact === "High" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          find.impact === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {find.impact} Impact
                        </span>
                        {find.priorityLevel && (
                          <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${
                            find.priorityLevel === "Critical" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            find.priorityLevel === "High" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                            find.priorityLevel === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-blue-500/10 text-blue-400 border-blue-500/10"
                          }`}>
                            P: {find.priorityLevel} ({find.priorityScore || 0})
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[11px]">
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-1">Codebase Proof</span>
                      {find.evidence}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Detected {find.date}</span>
                    </div>
                    <span>ID: {find.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
            <div>
              <h3 className="font-sans font-bold text-sm text-white">Periodic Evolution Reports</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Comprehensive audit logs compiled upon each core cognitive cycle.</p>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] px-2.5 py-1 rounded-full uppercase shrink-0">
              {reports.length} Logs
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-sans font-medium">No evolution audits logged.</p>
              <p className="text-xs text-slate-500 font-mono mt-1">Complete your first active cycle above to compile an Evolution Report.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((rep) => (
                <div 
                  key={rep.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="font-sans font-extrabold text-sm text-white">Evolution Assessment Report</h4>
                      <p className="text-[10px] font-mono text-slate-500 uppercase">Compiled: {rep.date} • Reference ID: {rep.id}</p>
                    </div>
                    <div className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded uppercase tracking-wider shrink-0">
                      Items Ingested: {rep.whatWasLearnedCount}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-3.5 rounded-xl border border-slate-900">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Executive Summary</span>
                    {rep.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">New Technologies Discovered</span>
                      {rep.newTechnologiesDiscovered.length === 0 ? (
                        <p className="text-slate-500 italic text-[11px]">No external technologies scanned.</p>
                      ) : (
                        <ul className="list-disc pl-4 space-y-1 text-slate-300">
                          {rep.newTechnologiesDiscovered.map((tech, i) => (
                            <li key={i}>{tech}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Identified Weaknesses & Improvements</span>
                      {rep.weaknessesIdentified.length === 0 ? (
                        <p className="text-emerald-500/80 italic text-[11px]">No structural issues detected.</p>
                      ) : (
                        <ul className="list-disc pl-4 space-y-1 text-slate-300">
                          {rep.weaknessesIdentified.map((weak, i) => (
                            <li key={i}>{weak}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Security Confidence: <span className="text-cyan-400 font-bold">{rep.confidenceLevels["security-risk-assessment"]}%</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>Scan Precision: <span className="text-fuchsia-400 font-bold">{rep.confidenceLevels["codebase-scan"]}%</span></span>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                      {rep.itemsAwaitingApprovalCount} Proposals Pending Approval
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Self Audits Tab */}
      {activeTab === "audits" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-5 border border-slate-800 rounded-xl">
            <div>
              <h3 className="font-sans font-bold text-sm text-white">Continuous Self-Audit Registry</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Automated background system auditing, confidence degradation, and duplicate pruning.</p>
            </div>
            <button
              onClick={triggerSelfAudit}
              disabled={isAuditing}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3.5 bg-indigo-500/15 border border-indigo-500/40 hover:bg-indigo-500/35 disabled:opacity-50 text-indigo-300 hover:text-white text-xs font-mono rounded-lg transition-all cursor-pointer uppercase tracking-wider"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Auditing Core...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-indigo-400" /> Force Self-Audit
                </>
              )}
            </button>
          </div>

          {/* Audit Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-xl space-y-1 font-mono text-xs">
              <span className="text-slate-500 uppercase text-[9px] block tracking-widest">Deduplication Guard</span>
              <div className="flex justify-between items-center text-slate-300">
                <span>Dice Threshold:</span>
                <span className="text-cyan-400 font-bold">65% Knowledge / 70% Props</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Method:</span>
                <span className="text-emerald-400 font-semibold">Token Dice Coefficient</span>
              </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-xl space-y-1 font-mono text-xs">
              <span className="text-slate-500 uppercase text-[9px] block tracking-widest">Knowledge Aging (Decay)</span>
              <div className="flex justify-between items-center text-slate-300">
                <span>Confidence Decay Rate:</span>
                <span className="text-cyan-400 font-bold">-5% per cycle</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Downgrade Threshold:</span>
                <span className="text-rose-400 font-bold">&lt; 50% Confidence</span>
              </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-xl space-y-1 font-mono text-xs">
              <span className="text-slate-500 uppercase text-[9px] block tracking-widest">System Integrity Status</span>
              <div className="flex justify-between items-center text-slate-300">
                <span>Total Audit Events:</span>
                <span className="text-indigo-400 font-bold">{auditLogs.length} Records</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Subsystem Status:</span>
                <span className="text-emerald-400 font-semibold">Active & Audited</span>
              </div>
            </div>
          </div>

          {/* Audit Event List */}
          {auditLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-sans font-medium">No audit logs registered yet.</p>
              <p className="text-xs text-slate-500 font-mono mt-1">Force a manual self-audit cycle above to inspect system integrity.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log, index) => (
                <div 
                  key={index}
                  className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-900">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${log.integrityOk ? "text-emerald-400" : "text-rose-400 animate-pulse"}`} />
                      <span className="font-sans font-bold text-xs text-white">System Integrity Audit Check</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{log.timestamp}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-center">
                      <span className="text-slate-500 block">INTEGRITY CHECK</span>
                      <span className={`font-bold ${log.integrityOk ? "text-emerald-400" : "text-rose-400"}`}>
                        {log.integrityOk ? "VERIFIED (PASS)" : "WARNING (FAIL)"}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-center">
                      <span className="text-slate-500 block">MERGED DUPLICATES</span>
                      <span className="text-cyan-400 font-bold">{log.duplicatesRemovedCount || 0}</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-center">
                      <span className="text-slate-500 block">AGED KNOWLEDGE</span>
                      <span className="text-amber-400 font-bold">{log.agedItemsCount || 0}</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 text-center">
                      <span className="text-slate-500 block">ISSUES DETECTED</span>
                      <span className={`font-bold ${log.issuesFound?.length > 0 ? "text-rose-400" : "text-slate-400"}`}>
                        {log.issuesFound?.length || 0}
                      </span>
                    </div>
                  </div>

                  {log.issuesFound && log.issuesFound.length > 0 && (
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 space-y-1">
                      <span className="text-[9px] font-mono text-rose-400 uppercase tracking-wider block font-bold">Identified Integrity Issues & Pruning Logs</span>
                      <ul className="list-disc pl-4 text-[10px] font-mono text-slate-300 space-y-1">
                        {log.issuesFound.map((issue: string, idx: number) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
