import si from "systeminformation";
import { getModelAverages } from "./db";

export interface OllamaModelDetails {
  parent_model?: string;
  format?: string;
  family?: string;
  families?: string[] | null;
  parameter_size?: string;
  quantization_level?: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  details?: OllamaModelDetails;
}

// Memory-cached system stats to avoid blocking CPU on rapid requests
let totalMemoryGB = 8;
si.mem().then(info => {
  totalMemoryGB = Math.round(info.total / (1024 ** 3));
}).catch(() => {});

export async function getOllamaStatus() {
  const start = Date.now();
  const ollamaHost = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
  try {
    const res = await fetch(`${ollamaHost}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      const latency = Date.now() - start;
      return { online: true, latency, models: (data.models || []) as OllamaModel[] };
    }
  } catch (err) {
    // Silently fail if Ollama is not active or reachable
  }
  return { online: false, latency: 0, models: [] as OllamaModel[] };
}

/**
 * Score a model based on the type of task, its parameters, family, format, and host memory limit.
 */
export function scoreModelForTask(model: OllamaModel, task: string, historicalStats?: Record<string, any>): number {
  const name = (model.name || "").toLowerCase();
  const details = model.details || {};
  const family = (details.family || "").toLowerCase();
  const families = (details.families || []).map(f => String(f).toLowerCase());
  
  let score = 50; // default base score

  // Extract Parameter Size in Billions (e.g. "7.0B" -> 7.0)
  let params = 0;
  if (details.parameter_size) {
    const match = details.parameter_size.match(/([\d.]+)/);
    if (match) params = parseFloat(match[1]);
  } else {
    // Estimate parameters from model size in bytes
    // (A 4-bit quantized model is roughly 0.6GB to 0.8GB per billion parameters)
    params = model.size / (1024 * 1024 * 1024) * 1.4;
  }

  // 1. Hardware Awareness (RAM / VRAM constraints)
  if (params > 0) {
    if (totalMemoryGB <= 8) {
      // Small system (e.g. 8GB): prefer smaller models to prevent severe lag / crash
      if (params <= 4) {
        score += 20; // 1.5B - 3B is perfect
      } else if (params > 4 && params <= 9) {
        score += 5;  // 7B - 8B is tight but doable
      } else {
        score -= 40; // > 9B will crawl or crash on 8GB RAM
      }
    } else if (totalMemoryGB <= 16) {
      // Medium system (e.g. 16GB): sweet spot is 7B-9B
      if (params >= 5 && params <= 11) {
        score += 25;
      } else if (params < 5) {
        score += 10;
      } else {
        score -= 20; // > 14B is heavy
      }
    } else {
      // Large system (e.g. 32GB+): prefer larger, highly accurate models
      if (params >= 13 && params <= 35) {
        score += 30; // 14B - 32B runs beautifully and is extremely accurate
      } else if (params >= 6 && params < 13) {
        score += 20; // 7B - 8B is fast
      } else if (params < 3) {
        score -= 10; // Penalize ultra-small models because they lack high reasoning accuracy
      }
    }
  }

  // 2. Task Capability Boosting
  if (task === "code") {
    // Coding task
    const codeKeywords = ["coder", "code", "starcoder", "deepseek", "codellama", "qwen2.5-coder", "command-r"];
    const hasCodeKeyword = codeKeywords.some(kw => name.includes(kw) || family.includes(kw) || families.includes(kw));
    
    if (hasCodeKeyword) {
      score += 45;
    }
    // DeepSeek coder models are supreme
    if (name.includes("deepseek") || family.includes("deepseek")) {
      score += 15;
    }
  } else if (task === "creative") {
    // Creative/Natural Language Writing
    if (name.includes("llama") || family.includes("llama") || families.includes("llama")) {
      score += 30; // Llama is famous for narrative fluency
    }
    if (name.includes("mistral") || family.includes("mistral") || families.includes("mistral")) {
      score += 25;
    }
    if (name.includes("gemma") || family.includes("gemma") || families.includes("gemma")) {
      score += 20;
    }
  } else if (task === "vision") {
    // Vision & Image understanding
    if (name.includes("vision") || name.includes("llava") || name.includes("moondream") || name.includes("bakllava") || name.includes("internvl")) {
      score += 65;
    }
  } else {
    // General task: Prefer balanced multilingual instruction models
    // Qwen is incredibly good with Bengali (বাংলা) and mixed-bilingual instructions!
    if (name.includes("qwen") || family.includes("qwen") || families.includes("qwen")) {
      score += 35;
    }
    if (name.includes("llama3.1") || name.includes("llama3.2") || name.includes("llama3.3")) {
      score += 25;
    } else if (name.includes("llama")) {
      score += 15;
    }
    if (name.includes("gemma") || family.includes("gemma")) {
      score += 20;
    }
    if (name.includes("phi") || family.includes("phi")) {
      score += 10;
    }
  }

  // 3. Version / Quality / Format Penalties/Bonuses
  if (name.includes("latest") || name.includes("instruct")) {
    score += 5; // Instruct models are best for chat, avoid base model weights if possible
  }

  // 4. Self-Learning Optimization Adjustments
  // Dynamically adjust model scores based on their real performance on the user's system
  const stats = historicalStats || getModelAverages();
  const modelHistory = stats[model.name];
  if (modelHistory && modelHistory.sampleCount > 0) {
    // A. Success Rate Modifier:
    // Reward reliable models, heavily penalize unstable or crashing models.
    if (modelHistory.successRate >= 0.95) {
      score += 20; // 100% reliable
    } else if (modelHistory.successRate < 0.75) {
      score -= 40; // Highly unstable/crashing on this PC
    }

    // B. Response Speed & Latency Modifier:
    // Prefer models that respond quickly on the local hardware.
    if (modelHistory.successRate > 0) {
      const avgLatency = modelHistory.avgLatencyMs;
      if (avgLatency > 0) {
        if (avgLatency < 4000) {
          score += 25; // Super fast response (< 4s)
        } else if (avgLatency < 10000) {
          score += 10; // Fast response (4s - 10s)
        } else if (avgLatency > 35000) {
          score -= 35; // Too slow on this machine (> 35s)
        }
      }

      // C. Token Generation Speed Modifier (Tokens per second):
      const avgSpeed = modelHistory.avgSpeedTps;
      if (avgSpeed > 0) {
        if (avgSpeed > 15) {
          score += 20; // Fast text generation
        } else if (avgSpeed < 3) {
          score -= 20; // Extremely laggy generation speed
        }
      }
    }
  }
  
  return Math.round(score);
}

/**
 * Dynamically resolves the best Ollama model for a task, respecting any environment constraints
 */
export async function getBestOllamaModel(task: string, userMessage: string): Promise<{ modelName: string; reason: string; score: number }> {
  const status = await getOllamaStatus();
  if (!status.online || status.models.length === 0) {
    return {
      modelName: process.env.OLLAMA_MODEL || "llama3",
      reason: "Ollama status is offline or no local models installed. Defaulting to llama3.",
      score: 0
    };
  }

  const models = status.models;

  // 1. OLLAMA_MODEL priority override
  const envModel = process.env.OLLAMA_MODEL;
  if (envModel) {
    const found = models.find(m => m.name === envModel || m.model === envModel || m.name.split(":")[0] === envModel);
    if (found) {
      return {
        modelName: found.name,
        reason: `Using environment preferred override OLLAMA_MODEL='${envModel}'.`,
        score: 100
      };
    }
  }

  // 2. Perform Intelligent Scoring
  const stats = getModelAverages();
  const scored = models.map(model => ({
    model,
    score: scoreModelForTask(model, task, stats)
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const modelName = best.model.name;
  const sizeText = best.model.details?.parameter_size ? ` (${best.model.details.parameter_size})` : "";
  const familyText = best.model.details?.family ? ` [Family: ${best.model.details.family}]` : "";

  return {
    modelName,
    reason: `Automated dynamic router selected '${modelName}'${sizeText}${familyText} for '${task}' task with score ${best.score}/100.`,
    score: best.score
  };
}

/**
 * Evaluates all local models for visual list display in the Model Manager settings panel
 */
export async function getEvaluatedOllamaModels() {
  const status = await getOllamaStatus();
  if (!status.online) {
    return { online: false, models: [] };
  }

  const stats = getModelAverages();
  const tasks = ["general", "code", "creative", "vision"];
  const evaluated = status.models.map(model => {
    const scores: Record<string, number> = {};
    tasks.forEach(t => {
      scores[t] = scoreModelForTask(model, t, stats);
    });

    return {
      name: model.name,
      sizeBytes: model.size,
      sizeGB: (model.size / (1024 ** 3)).toFixed(2) + " GB",
      family: model.details?.family || "unknown",
      parameterSize: model.details?.parameter_size || "unknown",
      quantization: model.details?.quantization_level || "unknown",
      format: model.details?.format || "gguf",
      scores,
      history: stats[model.name] || null
    };
  });

  return {
    online: true,
    latency: status.latency,
    systemRAM: `${totalMemoryGB} GB`,
    models: evaluated
  };
}
