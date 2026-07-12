import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dbPath = path.resolve(process.cwd(), "ruvi_memory.json");

export interface ModelMetric {
  modelName: string;
  latencyMs: number;
  tokens: number;
  speedTps: number;
  success: boolean;
  memorySizeGB: number;
  timestamp: string;
}

interface DBState {
  memory: any[];
  chat_history: any[];
  model_metrics?: ModelMetric[];
}

let db: DBState = { memory: [], chat_history: [], model_metrics: [] };

export function initDb() {
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      if (!db.model_metrics) {
        db.model_metrics = [];
      }
    } catch (err) {
      console.error("Failed to parse DB, starting fresh", err);
    }
  } else {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  }
  console.log("Ruvi JSON Database initialized at", dbPath);
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
