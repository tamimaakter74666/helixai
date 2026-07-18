import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dbPath = (() => { try { fs.accessSync(process.cwd(), fs.constants.W_OK); return path.resolve(process.cwd(), "ruvi_memory.json"); } catch (e) { return "/tmp/ruvi_memory.json"; } })();

export interface ModelMetric {
  modelName: string;
  latencyMs: number;
  tokens: number;
  speedTps: number;
  success: boolean;
  memorySizeGB: number;
  timestamp: string;
}

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

interface DBState {
  memory: any[];
  chat_history: any[];
  model_metrics?: ModelMetric[];
  system_logs?: SystemLog[];
  traces?: RequestTrace[];
}

let db: DBState = { memory: [], chat_history: [], model_metrics: [], system_logs: [], traces: [] };

export function initDb() {
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      if (!db.model_metrics) {
        db.model_metrics = [];
      }
      if (!db.system_logs) {
        db.system_logs = [];
      }
      if (!db.traces) {
        db.traces = [];
      }
    } catch (err) {
      console.error("Failed to parse DB, starting fresh", err);
    }
  } else {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  }
  console.log("Ruvi JSON Database initialized at", dbPath);
  
  // Seed some initial cool system logs if empty
  if (!db.system_logs || db.system_logs.length === 0) {
    db.system_logs = [
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: "success",
        category: "system",
        message: "Ruvi OS Kernel v4.0 loaded successfully.",
        details: "Core modules allocated in memory sandbox."
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 3000000).toISOString(),
        level: "info",
        category: "model",
        message: "Central AI Router initialized.",
        details: "Available Providers: Gemini, Claude, DeepSeek, Local Ollama."
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 2400000).toISOString(),
        level: "info",
        category: "automation",
        message: "WhatsApp Autopilot daemon initialized in background.",
        details: "Consent guard active. Safety rules loaded."
      }
    ];
    saveDb();
  }
}

function saveDb() {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export function saveModelMetric(metric: Omit<ModelMetric, "timestamp">) {
  try {
    if (!db.model_metrics) {
      db.model_metrics = [];
    }
    db.model_metrics.push({
      ...metric,
      timestamp: new Date().toISOString()
    });
    // Keep only the last 1000 metrics to prevent db file bloating
    if (db.model_metrics.length > 1000) {
      db.model_metrics.shift();
    }
    saveDb();
  } catch (err) {
    console.error("Failed to save model metric", err);
  }
}

export function getModelAverages(): Record<string, {
  avgLatencyMs: number;
  successRate: number;
  avgSpeedTps: number;
  memorySizeGB: number;
  sampleCount: number;
}> {
  if (!db.model_metrics || db.model_metrics.length === 0) return {};
  
  const stats: Record<string, {
    latencies: number[];
    successes: number;
    speeds: number[];
    memorySizeGB: number;
    count: number;
  }> = {};

  for (const m of db.model_metrics) {
    if (!stats[m.modelName]) {
      stats[m.modelName] = {
        latencies: [],
        successes: 0,
        speeds: [],
        memorySizeGB: m.memorySizeGB || 0,
        count: 0
      };
    }
    stats[m.modelName].count++;
    stats[m.modelName].latencies.push(m.latencyMs);
    if (m.success) stats[m.modelName].successes++;
    if (m.success && m.speedTps > 0) {
      stats[m.modelName].speeds.push(m.speedTps);
    }
    if (m.memorySizeGB) {
      stats[m.modelName].memorySizeGB = m.memorySizeGB;
    }
  }

  const result: Record<string, any> = {};
  for (const [name, data] of Object.entries(stats)) {
    const avgLatencyMs = data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length;
    const successRate = data.successes / data.count;
    const avgSpeedTps = data.speeds.length > 0 ? (data.speeds.reduce((a, b) => a + b, 0) / data.speeds.length) : 0;
    
    result[name] = {
      avgLatencyMs,
      successRate,
      avgSpeedTps,
      memorySizeGB: data.memorySizeGB,
      sampleCount: data.count
    };
  }

  return result;
}

export function saveMemory(type: string, content: string, metadata: any = {}, importance: number = 1) {
  return new Promise((resolve, reject) => {
    try {
      const id = uuidv4();
      db.memory.push({
        id, type, content, metadata: JSON.stringify(metadata), importance, timestamp: new Date().toISOString()
      });
      saveDb();
      resolve(id);
    } catch (err) {
      reject(err);
    }
  });
}

export function getMemories(limit: number = 50) {
  return new Promise((resolve, reject) => {
    try {
      const sorted = [...db.memory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(sorted.slice(0, limit));
    } catch (err) {
      reject(err);
    }
  });
}

export function updateMemory(id: string, updates: any) {
  return new Promise((resolve, reject) => {
    try {
      const index = db.memory.findIndex(m => m.id === id);
      if (index !== -1) {
        db.memory[index] = { ...db.memory[index], ...updates };
        saveDb();
        resolve(db.memory[index]);
      } else {
        reject(new Error("Memory not found"));
      }
    } catch (err) {
      reject(err);
    }
  });
}

export function deleteMemory(id: string) {
  return new Promise((resolve, reject) => {
    try {
      const index = db.memory.findIndex(m => m.id === id);
      if (index !== -1) {
        db.memory.splice(index, 1);
        saveDb();
        resolve(true);
      } else {
        reject(new Error("Memory not found"));
      }
    } catch (err) {
      reject(err);
    }
  });
}

export function saveChatMessage(role: string, content: string) {
  return new Promise((resolve, reject) => {
    try {
      const id = uuidv4();
      db.chat_history.push({
        id, role, content, timestamp: new Date().toISOString()
      });
      saveDb();
      resolve(id);
    } catch (err) {
      reject(err);
    }
  });
}

export function getChatHistory(limit: number = 20) {
  return new Promise((resolve, reject) => {
    try {
      const sorted = [...db.chat_history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      resolve(sorted.slice(-limit));
    } catch (err) {
      reject(err);
    }
  });
}

export function saveSystemLog(log: Omit<SystemLog, "id" | "timestamp">) {
  try {
    if (!db.system_logs) {
      db.system_logs = [];
    }
    const newLog: SystemLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    db.system_logs.push(newLog);
    // Keep last 1500 system logs to prevent bloat
    if (db.system_logs.length > 1500) {
      db.system_logs.shift();
    }
    saveDb();
    return newLog;
  } catch (err) {
    console.error("Failed to save system log:", err);
    return null;
  }
}

export function getSystemLogs(limit: number = 200) {
  try {
    if (!db.system_logs) return [];
    // Sort descending by timestamp (newest first)
    const sorted = [...db.system_logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted.slice(0, limit);
  } catch (err) {
    console.error("Failed to get system logs:", err);
    return [];
  }
}

export function clearSystemLogs() {
  try {
    db.system_logs = [];
    saveDb();
    return true;
  } catch (err) {
    console.error("Failed to clear system logs:", err);
    return false;
  }
}

export function saveRequestTrace(trace: RequestTrace) {
  try {
    if (!db.traces) {
      db.traces = [];
    }
    const idx = db.traces.findIndex(t => t.id === trace.id);
    if (idx !== -1) {
      db.traces[idx] = trace;
    } else {
      db.traces.push(trace);
    }
    // Limit to 1000 traces to prevent database bloat
    if (db.traces.length > 1000) {
      db.traces.shift();
    }
    saveDb();
    return true;
  } catch (err) {
    console.error("Failed to save request trace:", err);
    return false;
  }
}

export function getRequestTraces(limit: number = 100) {
  try {
    if (!db.traces) return [];
    const sorted = [...db.traces].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted.slice(0, limit);
  } catch (err) {
    console.error("Failed to get request traces:", err);
    return [];
  }
}

export function getRequestTrace(id: string) {
  try {
    if (!db.traces) return null;
    return db.traces.find(t => t.id === id) || null;
  } catch (err) {
    console.error("Failed to get request trace:", err);
    return null;
  }
}

export function clearRequestTraces() {
  try {
    db.traces = [];
    saveDb();
    return true;
  } catch (err) {
    console.error("Failed to clear request traces:", err);
    return false;
  }
}
