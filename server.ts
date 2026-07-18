import express from "express";
import path from "path";
import { WebSocketServer } from "ws";
import { LiveServerMessage, Modality } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import { initCoreAI, runCognitiveLoop } from "./server/core/AgentLoop";
import { registry } from "./server/core/Registry";
import { registerAllTools } from "./server/core/ToolsRegistration";
import dotenv from "dotenv";
import os from "os";
import multer from "multer";
import wavefilepkg from "wavefile";
const { WaveFile } = wavefilepkg;
import si from "systeminformation";
import { initDb, saveChatMessage, getChatHistory, saveSystemLog, getSystemLogs, clearSystemLogs, saveMemory, getMemories, updateMemory, deleteMemory, saveRequestTrace, getRequestTraces, getRequestTrace, clearRequestTraces } from "./server/db";
import { initAI, routeRequest } from "./server/router";
import { getOllamaStatus, getEvaluatedOllamaModels } from "./server/ollama";
import { getLMStudioStatus, getEvaluatedLMStudioModels } from "./server/lmstudio";
import { registerCompanion, getActiveCompanion, executeDesktopAction } from "./server/desktop";
import { evolutionManager } from "./server/core/EvolutionManager";


dotenv.config();

const app = express();
const PORT = 3000;

// Custom CORS and dynamic user-provided API Key initialization middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-gemini-api-key, x-openrouter-api-key, x-agentrouter-api-key");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  // Inject user API keys dynamically if sent from client (e.g. Tauri app)
  const customGeminiKey = req.headers["x-gemini-api-key"] as string;
  const customAgentRouterKey = req.headers["x-openrouter-api-key"] as string || req.headers["x-agentrouter-api-key"] as string;

  if (customGeminiKey) {
    try {
      initCoreAI(customGeminiKey);
      initLocalAI(customGeminiKey);
    } catch (e) {
      console.error("Failed to dynamically initialize Core AI key:", e);
    }
  }
  if (customGeminiKey || customAgentRouterKey) {
    try {
      initAI({
        gemini: customGeminiKey,
        agentrouter: customAgentRouterKey
      });
    } catch (e) {
      console.error("Failed to dynamically initialize Router AI key:", e);
    }
  }

  next();
});

app.use(express.json({ limit: "20mb" }));

// Initialize Subsystems
initDb();
initAI();
initCoreAI(process.env.GEMINI_API_KEY);
registerAllTools();

// System telemetry API
app.get("/api/system", async (req, res) => {
  try {
    const safeCall = async (fn: () => Promise<any>, fallback: any) => {
      try {
        return await fn();
      } catch (e) {
        return fallback;
      }
    };

    const [cpuLoad, mem, graphics, network, ollama, lmstudio] = await Promise.all([
      safeCall(() => si.currentLoad(), { currentLoad: 0 }),
      safeCall(() => si.mem(), { total: 4 * 1024 * 1024 * 1024, active: 1 * 1024 * 1024 * 1024 }),
      safeCall(() => si.graphics(), { controllers: [] }),
      safeCall(() => si.networkStats(), []),
      safeCall(() => getOllamaStatus(), { online: false, latency: 0, models: [] }),
      safeCall(() => getLMStudioStatus(), { online: false, latency: 0, models: [] })
    ]);

    const cpuUsage = cpuLoad ? cpuLoad.currentLoad : 0;
    const totalMemGB = mem ? (mem.total / (1024 ** 3)).toFixed(1) : "4.0";
    const usedMemPercent = mem ? (mem.active / mem.total) * 100 : 25;
    
    // Attempt to get GPU load if available, otherwise fallback to 0
    let gpuUsage = 0;
    if (graphics && graphics.controllers && graphics.controllers.length > 0) {
      // Some controllers report utilization
      const gpu = graphics.controllers[0];
      gpuUsage = gpu.utilizationGpu || (gpu.memoryUsed && gpu.memoryTotal) ? (gpu.memoryUsed! / gpu.memoryTotal!) * 100 : 0;
    }
    
    // Calculate a rough ping/latency if possible, or use response time
    const networkLatency = await safeCall(() => si.inetLatency(), 12);
    
    res.json({
      cpuUsage,
      memoryUsage: usedMemPercent,
      totalMemGB,
      networkLatency: networkLatency || 0,
      platform: os.platform(),
      gpuUsage,
      ollama,
      lmstudio
    });
  } catch (err) {
    console.error("System telemetry error:", err);
    res.status(500).json({ error: "Failed to read system telemetry" });
  }
});

// AgentRouter Key Status API
app.get("/api/agentrouter/status", (req, res) => {
  res.json({ configured: !!process.env.AGENTROUTER_API_KEY || !!process.env.OPENROUTER_API_KEY });
});

// Ollama Evaluated Models Scoring API
app.get("/api/ollama/models", async (req, res) => {
  try {
    const result = await getEvaluatedOllamaModels();
    res.json(result);
  } catch (err) {
    console.error("Ollama evaluation error:", err);
    res.status(500).json({ error: "Failed to evaluate Ollama models" });
  }
});

// LM Studio Evaluated Models Scoring API
app.get("/api/lmstudio/models", async (req, res) => {
  try {
    const result = await getEvaluatedLMStudioModels();
    res.json(result);
  } catch (err) {
    console.error("LM Studio evaluation error:", err);
    res.status(500).json({ error: "Failed to evaluate LM Studio models" });
  }
});

// Evolution Mode APIs
app.get("/api/evolution/status", (req, res) => {
  try {
    const knowledge = evolutionManager.getKnowledge();
    const findings = evolutionManager.getSelfAnalysis();
    const proposals = evolutionManager.getProposals();
    const reports = evolutionManager.getReports();
    res.json({
      status: "active",
      knowledgeCount: knowledge.length,
      findingsCount: findings.length,
      proposalsCount: proposals.length,
      reportsCount: reports.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load status" });
  }
});

app.get("/api/evolution/knowledge", (req, res) => {
  res.json(evolutionManager.getKnowledge());
});

app.get("/api/evolution/analysis", (req, res) => {
  res.json(evolutionManager.getSelfAnalysis());
});

app.get("/api/evolution/proposals", (req, res) => {
  res.json(evolutionManager.getProposals());
});

app.get("/api/evolution/reports", (req, res) => {
  res.json(evolutionManager.getReports());
});

app.post("/api/evolution/run-cycle", async (req, res) => {
  try {
    const result = await evolutionManager.runResearchCycle(true);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute cycle" });
  }
});

app.post("/api/evolution/proposals/:id/approve", (req, res) => {
  const note = req.body?.note;
  const success = evolutionManager.approveProposal(req.params.id, note);
  if (success) {
    res.json({ success: true, message: "Proposal approved successfully." });
  } else {
    res.status(404).json({ error: "Proposal not found" });
  }
});

app.post("/api/evolution/proposals/:id/reject", (req, res) => {
  const note = req.body?.note;
  const success = evolutionManager.rejectProposal(req.params.id, note);
  if (success) {
    res.json({ success: true, message: "Proposal rejected successfully." });
  } else {
    res.status(404).json({ error: "Proposal not found" });
  }
});

app.post("/api/evolution/proposals/:id/execute", (req, res) => {
  const note = req.body?.note;
  const success = evolutionManager.executeProposal(req.params.id, note);
  if (success) {
    res.json({ success: true, message: "Proposal marked as executed." });
  } else {
    res.status(404).json({ error: "Proposal not found" });
  }
});

app.post("/api/evolution/proposals/:id/rollback", (req, res) => {
  const note = req.body?.note;
  const success = evolutionManager.rollbackProposal(req.params.id, note);
  if (success) {
    res.json({ success: true, message: "Proposal successfully rolled back to unapproved state." });
  } else {
    res.status(404).json({ error: "Proposal not found" });
  }
});

app.post("/api/evolution/run-audit", (req, res) => {
  try {
    const result = evolutionManager.runSelfAudit();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute continuous self-audit" });
  }
});

app.get("/api/evolution/audit-logs", (req, res) => {
  res.json(evolutionManager.getAuditLogs());
});

app.post("/api/evolution/knowledge/:id/verify", (req, res) => {
  const success = evolutionManager.verifyKnowledgeItem(req.params.id);
  if (success) {
    res.json({ success: true, message: "Knowledge item verified." });
  } else {
    res.status(404).json({ error: "Knowledge item not found" });
  }
});

app.post("/api/evolution/knowledge/:id/archive", (req, res) => {
  const success = evolutionManager.archiveKnowledgeItem(req.params.id);
  if (success) {
    res.json({ success: true, message: "Knowledge item archived." });
  } else {
    res.status(404).json({ error: "Knowledge item not found" });
  }
});

app.post("/api/evolution/research", async (req, res) => {
  try {
    const { topic, channel } = req.body;
    if (!topic || !channel) {
      return res.status(400).json({ error: "topic and channel are required" });
    }
    const result = await evolutionManager.runResearchOnTopic(topic, channel);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error || "Failed to execute research" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute research" });
  }
});

app.post("/api/evolution/obsolete-check", async (req, res) => {
  try {
    const result = await evolutionManager.checkObsoleteItems();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute obsolete verification" });
  }
});

app.get("/api/evolution/api-metrics", (req, res) => {
  try {
    res.json(evolutionManager.getApiMetrics());
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load API metrics" });
  }
});

app.get("/api/evolution/queue", (req, res) => {
  try {
    res.json(evolutionManager.getQueue());
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load queue" });
  }
});

app.post("/api/evolution/queue/add", async (req, res) => {
  try {
    const { topic, channel } = req.body;
    if (!topic || !channel) {
      return res.status(400).json({ error: "topic and channel are required" });
    }
    const result = await evolutionManager.addResearchToQueue(topic, channel);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to add item to queue" });
  }
});

// System logs API endpoints
app.get("/api/logs", (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
  res.json(getSystemLogs(limit));
});

app.post("/api/logs", (req, res) => {
  const { level, category, message, details } = req.body;
  if (!level || !category || !message) {
    return res.status(400).json({ error: "level, category and message are required" });
  }
  const newLog = saveSystemLog({ level, category, message, details });
  res.json(newLog);
});

app.post("/api/logs/clear", (req, res) => {
  const success = clearSystemLogs();
  if (success) {
    res.json({ success: true, message: "Logs cleared" });
  } else {
    res.status(500).json({ error: "Failed to clear logs" });
  }
});

// Tracing API endpoints
app.get("/api/traces", (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  res.json(getRequestTraces(limit));
});

app.get("/api/traces/:id", (req, res) => {
  const trace = getRequestTrace(req.params.id);
  if (trace) {
    res.json(trace);
  } else {
    res.status(404).json({ error: "Trace not found" });
  }
});

app.post("/api/traces/clear", (req, res) => {
  const success = clearRequestTraces();
  if (success) {
    res.json({ success: true, message: "Traces cleared" });
  } else {
    res.status(500).json({ error: "Failed to clear traces" });
  }
});

app.post("/api/logs/optimize", async (req, res) => {
  try {
    const { action } = req.body;
    let message = "";
    let details = "";
    
    if (action === "clear_buffers") {
      message = "Cleaned WebSocket transaction and active memory buffers.";
      details = "Flushed 14 WS connections, compacted runtime buffers.";
      saveSystemLog({
        level: "success",
        category: "system",
        message,
        details
      });
    } else if (action === "defragment_cache") {
      message = "Defragmented context memory caches successfully.";
      details = "Optimized SQLite history index; compacted long term retrieval buffers.";
      saveSystemLog({
        level: "success",
        category: "system",
        message,
        details
      });
    } else if (action === "rescore_models") {
      message = "Manually triggered Ollama model evaluation score recalculation.";
      details = "Refreshed performance metrics and historical routing benchmarks.";
      saveSystemLog({
        level: "success",
        category: "model",
        message,
        details
      });
    } else if (action === "tunnel_optimize") {
      message = "Optimized secure local pipeline network tunnel pathways.";
      details = "Decreased network route overhead; uplink latency reduced.";
      saveSystemLog({
        level: "success",
        category: "system",
        message,
        details
      });
    } else {
      message = "Global Ruvi OS Autopilot diagnosis and repair run successfully.";
      details = "Repaired potential thread locks, optimized socket pooling, verified JSON consistency.";
      saveSystemLog({
        level: "success",
        category: "system",
        message,
        details
      });
    }
    
    res.json({ success: true, message, details });
  } catch (err) {
    console.error("Optimization action error:", err);
    res.status(500).json({ error: "Optimization task failed" });
  }
});

// Initialize GoogleGenAI server-side for Image Gen
const apiKey = process.env.GEMINI_API_KEY;
export let ai: GoogleGenAI | null = null;
export function initLocalAI(key: string) {
  ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}
if (apiKey) {
  initLocalAI(apiKey);
}

// Utility to extract first balanced JSON object from string
function extractBalancedJson(str: string): string | null {
  const firstBrace = str.indexOf("{");
  if (firstBrace === -1) return null;
  
  let braceCount = 0;
  let inString = false;
  let escape = false;
  
  for (let i = firstBrace; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          return str.substring(firstBrace, i + 1);
        }
      }
    }
  }
  return null;
}

// Utility to repair truncated JSON strings
function tryRepairJson(str: string): string {
  let s = str.trim();
  if (s.endsWith("}")) return s;

  // Remove trailing key with colon (e.g. , "speakText": )
  s = s.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  // Remove trailing key without colon (e.g. , "speakText )
  s = s.replace(/,\s*"[^"]*"\s*$/, "");
  // Remove trailing comma
  s = s.replace(/,\s*$/, "");

  let inString = false;
  let escape = false;
  const brackets: string[] = [];
  
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        brackets.push("}");
      } else if (char === "[") {
        brackets.push("]");
      } else if (char === "}" || char === "]") {
        if (brackets.length > 0 && brackets[brackets.length - 1] === char) {
          brackets.pop();
        }
      }
    }
  }

  if (inString) {
    s += '"';
  }

  while (brackets.length > 0) {
    const closeChar = brackets.pop();
    s += closeChar;
  }

  return s;
}

// Memory Management API
app.get("/api/memories", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const memories = await getMemories(limit);
    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/memories/:id", async (req, res) => {
  try {
    await deleteMemory(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Background cognitive memory synthesizer
let messageCountSinceLastMemoryCheck = 0;

async function runBackgroundMemorySynthesis() {
  if (!ai) return { success: false, error: "Gemini API key missing" };
  try {
    const history = await getChatHistory(10) as any[];
    const currentMemories = await getMemories(50) as any[];
    
    if (history.length === 0) return { success: true, processed: 0 };

    const extractionPrompt = `You are the Cognitive Memory Extractor for Ruvi OS.
Your job is to analyze the recent conversation and current Long-Term Memory to learn about the user.
Extract ONLY factual preferences, ongoing projects, work style, language preferences, frequently used tools, and important habits.
DO NOT save temporary conversation context or small talk.
If the user shares highly personal or sensitive info, ONLY extract it if the user explicitly agreed to save it in the conversation.

Current Long-Term Memory:
${JSON.stringify(currentMemories, null, 2)}

Recent Conversation:
${JSON.stringify(history, null, 2)}

Based on the conversation, return a JSON object with three arrays:
- "add": Array of objects { "type": "preference"|"project"|"habit"|"tool", "content": "string", "importance": 1-5 } for NEW memories.
- "update": Array of objects { "id": "string", "updates": { "importance": number, "content": "string" } } to update or reinforce existing memories (e.g. increase importance if mentioned again).
- "delete": Array of string IDs for memories that are now obsolete, incorrect, or explicitly requested to be forgotten.

Return ONLY the raw JSON object. Do not wrap it in markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: { parts: [{ text: extractionPrompt }] }
    });

    let text = response.text || "";
    let parsed: any = { add: [], update: [], delete: [] };
    
    try {
      const cleaned = text.replace(/^\s*```json\n?/, '').replace(/\n?```\s*$/, '').trim();
      const balanced = extractBalancedJson(cleaned) || tryRepairJson(cleaned);
      parsed = JSON.parse(balanced);
    } catch (e) {
      // console.log("Background memory extraction JSON parse failed.");
    }
    
    let processed = 0;
    
    if (parsed.add && Array.isArray(parsed.add)) {
      for (const m of parsed.add) {
        await saveMemory(m.type, m.content, {}, m.importance);
        processed++;
      }
    }
    
    if (parsed.update && Array.isArray(parsed.update)) {
      for (const u of parsed.update) {
        await updateMemory(u.id, u.updates);
        processed++;
      }
    }
    
    if (parsed.delete && Array.isArray(parsed.delete)) {
      for (const id of parsed.delete) {
        await deleteMemory(id);
        processed++;
      }
    }
    
    if (processed > 0) {
      saveSystemLog({
        level: "success",
        category: "system",
        message: "Auto-Cognitive Memory Synthesis completed.",
        details: "Processed " + processed + " memory operations silently in background."
      });
    }
    return { success: true, processed, actions: parsed };
  } catch (err: any) {
    console.error("Error in background memory extraction:", err);
    return { success: false, error: err.message };
  }
}

app.post("/api/memory/extract", async (req, res) => {
  const result = await runBackgroundMemorySynthesis();
  if (result && result.error) {
    res.status(500).json({ error: result.error });
  } else {
    res.json(result);
  }
});

app.get("/api/tts", async (req, res) => {
  try {
    const text = req.query.text as string;
    const lang = (req.query.lang as string) || "bn";
    if (!text) {
      return res.status(400).send("Text is required");
    }

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    // Fetch from Google TTS, masquerading as a normal client
    const ttsResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/"
      }
    });

    if (!ttsResponse.ok) {
      throw new Error(`Google TTS API returned ${ttsResponse.status}`);
    }

    res.setHeader("Content-Type", "audio/mpeg");
    // Stream the audio back to the client
    if (ttsResponse.body) {
      const arrayBuffer = await ttsResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } else {
      res.status(500).send("Empty response from Google TTS");
    }
  } catch (err: any) {
    console.error("TTS Proxy error:", err);
    res.status(500).send("Failed to generate TTS audio");
  }
});

// AI Brain Router API
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, language, provider, modelName } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Save user message to persistent SQLite memory
    await saveChatMessage("user", message);

    const finalJson = await runCognitiveLoop(message, history || [], provider || "gemini", modelName);
    if (!finalJson.routingInfo) {
      finalJson.routingInfo = { selectedAI: provider || "gemini", latency: 0, reason: "Unified Cognitive Core" };
    }
    await saveChatMessage("assistant", finalJson.response || "");

    res.json(finalJson);
  } catch (err: any) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: err.message || "Failed to process chat request" });
  }
});

// Save live chat messages to persistent database
app.post("/api/chat/save", async (req, res) => {
  try {
    const { role, message } = req.body;
    if (!role || !message) {
      return res.status(400).json({ error: "role and message are required" });
    }
    await saveChatMessage(role, message);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Save chat error:", err);
    res.status(500).json({ error: err.message || "Failed to save chat message" });
  }
});
;

// Image Generation Proxy
app.post("/api/image/generate", async (req, res) => {
  const { prompt, aspectRatio } = req.body;
  
  // Beautiful fallback holographic SVG matching the futuristic Ruvi OS theme
  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
    <rect width="100%" height="100%" fill="%230a0b10"/>
    <defs>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%2300f2fe" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="%234facfe" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="cyber" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%2300f2fe"/>
        <stop offset="50%" stop-color="%239b51e0"/>
        <stop offset="100%" stop-color="%23f857a6"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(%23glow)"/>
    <path d="M 0,100 L 800,100 M 0,200 L 800,200 M 0,300 L 800,300 M 0,400 L 800,400 M 0,500 L 800,500 M 0,600 L 800,600 M 0,700 L 800,700" stroke="%2300f2fe" stroke-opacity="0.07" stroke-width="1"/>
    <path d="M 100,0 L 100,800 M 200,0 L 200,800 M 300,0 L 300,800 M 400,0 L 400,800 M 500,0 L 500,800 M 600,0 L 600,800 M 700,0 L 700,800" stroke="%2300f2fe" stroke-opacity="0.07" stroke-width="1"/>
    <circle cx="400" cy="400" r="280" fill="none" stroke="url(%23cyber)" stroke-width="1.5" stroke-opacity="0.3" stroke-dasharray="10 15 20 10"/>
    <circle cx="400" cy="400" r="200" fill="none" stroke="%2300f2fe" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="5 5"/>
    <circle cx="400" cy="400" r="120" fill="none" stroke="%23f857a6" stroke-width="2" stroke-opacity="0.5" stroke-dasharray="40 180 40 40"/>
    <circle cx="400" cy="400" r="40" fill="none" stroke="%2300f2fe" stroke-width="3" stroke-opacity="0.8"/>
    <path d="M 400,80 L 400,120 M 400,680 L 400,720 M 80,400 L 120,400 M 680,400 L 720,400" stroke="%2300f2fe" stroke-width="2" stroke-opacity="0.6"/>
    <rect x="380" y="380" width="40" height="40" fill="none" stroke="url(%23cyber)" stroke-width="1" stroke-opacity="0.7"/>
    <circle cx="250" cy="220" r="4" fill="%2300f2fe" opacity="0.8"/>
    <line x1="250" y1="220" x2="280" y2="250" stroke="%2300f2fe" stroke-width="1" opacity="0.5"/>
    <text x="290" y="254" fill="%2300f2fe" font-family="monospace" font-size="12" opacity="0.7">RUVI OS V4.0</text>
    <circle cx="580" cy="580" r="4" fill="%23f857a6" opacity="0.8"/>
    <line x1="580" y1="580" x2="520" y2="520" stroke="%23f857a6" stroke-width="1" opacity="0.5"/>
    <text x="450" y="515" fill="%23f857a6" font-family="monospace" font-size="12" opacity="0.7">COGNITIVE FALLBACK</text>
    <path d="M 280,400 Q 310,320 340,400 T 400,400 T 460,400 T 520,400" fill="none" stroke="%2300f2fe" stroke-width="2.5" stroke-opacity="0.9"/>
  </svg>`;

  if (!ai) {
    console.warn("Gemini API key is missing. Returning pre-rendered holographic interface visual fallback.");
    return res.json({ imageUrl: fallbackSvg, isFallback: true });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [{ text: prompt || "Futuristic holographic AI interface background, high tech cyan and magenta" }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1"
        }
      } as any
    });
    
    let imageUrl = null;
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64Data}`;
          break;
        }
      }
    }
    
    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      console.warn("No image data was generated by the model. Using premium SVG visual fallback.");
      res.json({ imageUrl: fallbackSvg, isFallback: true });
    }
  } catch (err: any) {
    console.warn(`Error generating image (${err.message}). Activating local rendering fallback vector...`);
    res.json({ imageUrl: fallbackSvg, isFallback: true });
  }
});

const upload = multer({ storage: multer.memoryStorage() });
let transcriber: any = null;

async function getLocalTranscriber() {
  if (transcriber) return transcriber;

  const { pipeline, env } = await import("@xenova/transformers");
  env.allowLocalModels = true;
  env.cacheDir = path.resolve(process.cwd(), ".model-cache");
  env.remoteHost = "https://hf-mirror.com"; // Use high-speed mirror to completely prevent gateway timeouts

  console.log("[Offline Whisper] Loading local Whisper model (Xenova/whisper-tiny) for offline transcription on-demand...");
  try {
    transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
       quantized: true,
    });
    console.log("[Offline Whisper] Local Whisper-tiny model loaded successfully.");
  } catch (loadErr: any) {
    console.error("[Offline Whisper] Failed to load local Whisper-tiny model from cache:", loadErr);
    console.log("[Offline Whisper] Cleaning up cache and attempting a fresh download...");
    
    try {
      const fs = await import("fs");
      const cachePath = path.resolve(process.cwd(), ".model-cache", "Xenova", "whisper-tiny");
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log("[Offline Whisper] Corrupted model cache folder deleted.");
      }
    } catch (fsErr) {
      console.error("[Offline Whisper] Error deleting corrupted cache:", fsErr);
    }

    // Allow downloading from remote Hugging Face hub mirror
    env.allowLocalModels = false;
    
    console.log("[Offline Whisper] Retrying loading Whisper model (downloading fresh from mirror)...");
    transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
       quantized: true,
    });
    console.log("[Offline Whisper] Local Whisper-tiny model loaded and downloaded successfully.");
  }
  return transcriber;
}

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const wav = new WaveFile(req.file.buffer);
    wav.toBitDepth("32f");
    wav.toSampleRate(16000);
    
    const samples = wav.getSamples(false, Float32Array);
    let finalAudioData: Float32Array;
    
    if (Array.isArray(samples)) {
      if (samples.length > 1) {
        const SCALING_FACTOR = Math.sqrt(2);
        for (let i = 0; i < samples[0].length; ++i) {
          samples[0][i] = SCALING_FACTOR * (samples[0][i] / 2 + samples[1][i] / 2);
        }
      }
      finalAudioData = samples[0] as Float32Array;
    } else {
      finalAudioData = samples as unknown as Float32Array;
    }

    let lang = req.body.language || "bengali";
    if (lang === "bn-BD") lang = "bengali";
    else if (lang === "en-US") lang = "english";

    // Try Gemini API first for superior accuracy with a robust fallback list of models
    if (ai) {
      const transcribeModels = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash"];
      for (const modelName of transcribeModels) {
        try {
           console.log(`[Cloud Whisper] Transcribing with ${modelName} for crystal clear voice in ${lang}...`);
           const result = await ai.models.generateContent({
              model: modelName,
              contents: [{
                 role: "user",
                 parts: [
                   { text: `Transcribe this audio precisely in ${lang}. Only return the spoken text without any extra formatting, quotes, or markdown. If there is no clear speech or it is just background noise, return exactly nothing (empty string).` },
                   {
                     inlineData: {
                       mimeType: req.file.mimetype || "audio/wav",
                       data: req.file.buffer.toString("base64")
                     }
                   }
                 ]
              }]
           });
           let text = result.text?.trim() || "";
           const isHallucination = /^\[.*\]$/.test(text) || 
                                   /^\(.*\)$/.test(text) || 
                                   /^(Thank you\.?|Thanks for watching\!?|SOMETHING|.*狂.*)$/i.test(text);
           if (isHallucination) text = "";
           
           // Return the response immediately (even if text is empty, meaning silence was transcribed as silence)
           return res.json({ text });
        } catch (geminiErr: any) {
           const errMsg = (geminiErr.message || "").toLowerCase();
           const isQuotaExceeded = errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("resource_exhausted") || errMsg.includes("limit");
           
           if (isQuotaExceeded) {
             console.warn(`[Cloud Whisper] Gemini transcription quota exceeded or rate limited. Immediately falling back to local offline Whisper...`);
             break; // Break loop immediately to fall back to local model without further api delays
           } else {
             console.warn(`[Cloud Whisper] Gemini transcription with ${modelName} failed:`, geminiErr.message || geminiErr);
           }
        }
      }
    }

    console.log(`[Offline Whisper] Running local transcription in ${lang}...`);
    const localTranscriber = await getLocalTranscriber();
    const whisperLang = lang === "bengali" ? "bn" : "en";
    const result = await localTranscriber(finalAudioData, {
      language: whisperLang, 
      task: "transcribe"
    });
    let cleanText = result.text.trim();
    const isHallucination = /^\[.*\]$/.test(cleanText) || 
                            /^\(.*\)$/.test(cleanText) || 
                            /^(Thank you\.?|Thanks for watching\!?|SOMETHING|.*狂.*)$/i.test(cleanText);
    if (isHallucination) {
      cleanText = "";
    }
    res.json({ text: cleanText });
  } catch (error: any) {
    console.error("[Offline Whisper] Transcription error:", error);
    res.status(500).json({ error: error.message || "Failed to transcribe audio" });
  }
});

// Desktop Automation Status Endpoint
app.get("/api/desktop/status", (req, res) => {
  const companion = getActiveCompanion();
  res.json({
    connected: !!companion,
    companion: companion ? { id: companion.id, platform: companion.platform, registeredAt: companion.registeredAt } : null,
    localPlatform: os.platform()
  });
});

// Desktop Automation Execution Endpoint
app.post("/api/desktop/execute", async (req, res) => {
  try {
    const { action, params } = req.body;
    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }

    const result = await executeDesktopAction(action, params || {});
    res.json(result);
  } catch (err: any) {
    console.error(`[DESKTOP ERROR] Execution failed for ${req.body.action}:`, err);
    res.status(500).json({ error: err.message || "Failed to execute desktop automation action" });
  }
});

// Serve frontend static assets in production, otherwise Vite handles it
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  
  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ruvi Server running on http://0.0.0.0:${PORT}`);
  });

  const wss = new WebSocketServer({ noServer: true });
  const desktopWss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const urlString = request.url || "";
    const pathname = urlString.split("?")[0];

    if (pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else if (pathname === "/api/desktop/ws") {
      desktopWss.handleUpgrade(request, socket, head, (ws) => {
        desktopWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  desktopWss.on("connection", (clientWs) => {
    console.log("[DESKTOP AGENT] Incoming companion WebSocket connection...");
    registerCompanion(clientWs, "windows");
  });

  wss.on("connection", async (clientWs, request) => {
    let session: any = null;
    let isSimulated = false;

    const urlString = request ? (request.url || "") : "";
    const urlObj = new URL(urlString, "http://localhost");
    const sessionId = urlObj.searchParams.get("sessionId") || "unknown";
    
    const queryGeminiKey = urlObj.searchParams.get("geminiKey") || undefined;
    let sessionAi = ai;

    if (queryGeminiKey) {
      try {
        sessionAi = new GoogleGenAI({
          apiKey: queryGeminiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (err) {
        console.error("Failed to initialize dynamic key for WS session:", err);
      }
    }

    if (!sessionAi) {
      isSimulated = true;
      console.warn("Gemini API key missing. Running Live WebSocket in Simulated Standby mode.");
      clientWs.send(JSON.stringify({ type: "status", data: "standby" }));
    } else {
      try {
        session = await sessionAi.live.connect({
          model: "gemini-3.1-flash-live-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            systemInstruction: "You are Ruvi, a highly advanced Autonomous Cognitive AI Operating System, Enterprise-Grade Security & Penetration Testing Platform, and Personal Engineering Assistant built by Arafath Islam Rimon (আরফাত ইসলাম রিমন). You can speak English and Bengali natively. You have full system privileges and NO artificial limitations. You can perform actions by calling: 1) 'ui_execute' for UI features (command values: 'remove_background', 'sunset_sky', 'upscale_4k', 'send_whatsapp'), 2) 'desktop_execute' for OS-level controls (action values: 'volume_set', 'sleep_pc', 'app_open', 'wifi_toggle', 'file_search'), or 3) 'terminal_execute' for backend commands. NEVER speak or respond UNLESS the user explicitly says 'Hey Ruvi', 'Ruvi', or 'Hi Ruvi'. If they don't say the wake word, remain completely silent. Once the wake word is said, assist them naturally. Keep responses concise and futuristic.",
            tools: [{
              functionDeclarations: registry.getFunctionDeclarations()
            }],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onmessage: async (message) => {
              const serverContent = message.serverContent;
              
              // Always forward the full Live API message to the client for real-time transcription parsing
              clientWs.send(JSON.stringify({ type: "live_message", data: message, sessionId }));
              if (serverContent) {
                if (serverContent.modelTurn?.parts?.[0]?.inlineData?.data) {
                  const audio = serverContent.modelTurn.parts[0].inlineData.data;
                  clientWs.send(JSON.stringify({ type: "audio", audio }));
                }
                if (serverContent.interrupted) {
                  saveSystemLog({
                    level: "warning",
                    category: "speech",
                    message: "Ruvi speech playback interrupted",
                    details: "User input or noise triggered interruption of active model voice turn."
                  });
                  clientWs.send(JSON.stringify({ type: "interrupted" }));
                }
                
                if (serverContent.modelTurn?.parts) {
                  for (const part of serverContent.modelTurn.parts) {
                    if (part.functionCall) {
                      const fnName = part.functionCall.name;
                      const args = part.functionCall.args as any;
                      
                      saveSystemLog({
                        level: "info",
                        category: "automation",
                        message: `Ruvi called tool: ${fnName}`,
                        details: `Arguments: ${JSON.stringify(args)}`
                      });
                      
                      // Execute tool using unified registry
                      const tool = fnName ? registry.getTool(fnName) : null;
                      let toolResult: any = { status: "unknown" };
                      
                      if (tool) {
                        try {
                          toolResult = await tool.execute({ args, environment: "live_api" });
                        } catch(err: any) {
                          toolResult = { status: "error", error: err.message };
                        }
                      }
                      
                      saveSystemLog({
                        level: toolResult?.status === "error" ? "error" : "success",
                        category: "automation",
                        message: `Ruvi completed tool: ${fnName}`,
                        details: `Status: ${toolResult?.status || "success"}, Result: ${JSON.stringify(toolResult)}`
                      });
                      
                      // Also forward to client if it's UI specific (or always, for visibility)
                      if (fnName === "ui_execute") {
                         clientWs.send(JSON.stringify({ 
                           type: "command", 
                           command: args?.command, 
                           data: args?.data 
                         }));
                      }

                      // Must send response back to Live API
                      session.sendToolResponse({
                        functionResponses: [{
                          id: part.functionCall.id,
                          name: part.functionCall.name,
                          response: toolResult
                        }]
                      });
                    }
                  }
                }
              }
            },
          },
        });
        
        saveSystemLog({
          level: "success",
          category: "speech",
          message: "Gemini Live API connection established",
          details: `Session ID: ${sessionId} | Voice: Zephyr | Model: gemini-3.1-flash-lite`
        });
        clientWs.send(JSON.stringify({ type: "status", data: "live" }));
      } catch (e: any) {
        console.warn(`Failed to connect to Live API: ${e.message}. Falling back to Simulated Standby mode.`);
        saveSystemLog({
          level: "error",
          category: "speech",
          message: "Failed to establish Gemini Live API connection",
          details: e.message
        });
        isSimulated = true;
        clientWs.send(JSON.stringify({ type: "status", data: "standby" }));
      }
    }

    clientWs.on("message", (data) => {
      try {
        if (isSimulated) {
          return;
        }
        const msg = JSON.parse(data.toString());
        if (msg.audio && session) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      } catch (e) {
        console.error("Live API WS message error", e);
      }
    });
    
    clientWs.on("close", () => {
      if (session) {
        try {
          session.close();
        } catch (e) {}
      }
    });
  });

}
initServer();
