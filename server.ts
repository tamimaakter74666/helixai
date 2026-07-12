import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { LiveServerMessage, Modality } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import os from "os";
import si from "systeminformation";
import { initDb, saveChatMessage, getChatHistory } from "./server/db";
import { initAI, routeRequest } from "./server/router";
import { getOllamaStatus } from "./server/ollama";
import { registerCompanion, getActiveCompanion, executeDesktopAction } from "./server/desktop";


dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Initialize Subsystems
initDb();
initAI();

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

    const [cpuLoad, mem, graphics, network, ollama] = await Promise.all([
      safeCall(() => si.currentLoad(), { currentLoad: 0 }),
      safeCall(() => si.mem(), { total: 4 * 1024 * 1024 * 1024, active: 1 * 1024 * 1024 * 1024 }),
      safeCall(() => si.graphics(), { controllers: [] }),
      safeCall(() => si.networkStats(), []),
      safeCall(() => getOllamaStatus(), { online: false, latency: 0, models: [] })
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
      ollama
    });
  } catch (err) {
    console.error("System telemetry error:", err);
    res.status(500).json({ error: "Failed to read system telemetry" });
  }
});

// Initialize GoogleGenAI server-side for Image Gen
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
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

// AI Brain Router API
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, language, provider } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Save user message to persistent SQLite memory
    await saveChatMessage("user", message);

    const systemPrompt = `You are "Ruvi", a futuristic, premium, holographic AI assistant and Operating System with a sleek Sci-Fi persona.
You must speak naturally in Bengali (বাংলা), English, or "Banglish". Match the user's language and tone.
Your core capabilities include:
1. Advanced Voice Chat
2. Image / Screen Analysis & OCR
3. Workflow Automation
4. Direct Windows/Desktop Control & File Management (Automatically executed)

When the user asks you to control their computer or do desktop actions (like change volume, change brightness, open/close apps, take a screenshot, read the screen, manage files, lock pc, sleep pc, toggle Wi-Fi, etc.), you MUST automatically select the appropriate command from the list below and populate the "command" and "commandData" fields.

You MUST respond strictly in valid JSON format. Your response MUST be a single JSON object with these keys:
- "response": The markdown text response in Bengali, English, or Banglish (based on user language) to show in the chat screen. Tell the user you are executing the action.
- "speakText": A clean, simple text-only version of the response (without markdown) to be spoken out loud by the TTS system in the matching language. Keep it concise.
- "detectedEmotion": The classified emotional state of the conversation, as one of: "calm" (default), "joy" (happy, positive), "sorrow" (sad, apologetic, empathetic), "anger" (frustrated, intense), "surprise" (excited, amazed, energetic).
- "command": String key of the action. It MUST be one of:
  - "volume_set" (params: { "level": 0 to 100 }) - for changing sound/volume (e.g. "sound barie dao", "volume standard 80% kore dao")
  - "brightness_set" (params: { "level": 0 to 100 }) - for display brightness (e.g. "brightness komao", "brightness 50% koro")
  - "wifi_toggle" (params: { "enable": true/false }) - for Wi-Fi (e.g. "wifi off koro", "turn on wifi")
  - "bluetooth_toggle" (params: { "enable": true/false }) - for Bluetooth
  - "lock_pc" (no params) - to lock PC workstation (e.g. "pc lock koro", "lock computer")
  - "sleep_pc" (no params) - to put PC to sleep
  - "restart_pc" (no params) - to reboot PC
  - "shutdown_pc" (no params) - to shutdown PC
  - "app_open" (params: { "name": string }) - to open application (e.g. "open notepad", "chrome chaloo koro")
  - "app_close" (params: { "name": string }) - to close application (e.g. "close chrome", "taskkill calculator")
  - "screenshot" (no params) - to take a screen capture (e.g. "screenshot nao", "capture screen")
  - "ocr_read" (no params) - to read/OCR active screen content (e.g. "screen reading koro", "ocr scan screen")
  - "file_search" (params: { "query": string }) - search files (e.g. "file khujo", "find pdf files")
  - "file_create_folder" (params: { "path": string }) - create directories (e.g. "create folder named backups")
  - "file_rename" (params: { "src": string, "dest": string }) - rename files
  - "file_delete" (params: { "path": string }) - delete file
  - "remove_background", "sunset_sky", "upscale_4k", "send_whatsapp", "toggle_lights", "none"
- "commandData": An object containing parameters for the command, e.g.:
  - For "volume_set": { "level": 80 }
  - For "app_open": { "name": "notepad.exe" }
  - For "wifi_toggle": { "enable": false }
  - For "send_whatsapp": { "contact": "Rahim", "message": "Hi Rahim" }
  - For others: {}

Provide ONLY the JSON object. Do not wrap it in markdown code blocks like \`\`\`json. Return pure raw JSON string.`;

    // Use Central Model Router
    const { text, routing } = await routeRequest(message, history || [], systemPrompt, language, provider);

    let parsed;
    // Clean text safely without mangling closing braces
    const cleanedText = text.replace(/^\s*```json\n?/, '').replace(/\n?```\s*$/, '').trim();
    
    try {
      parsed = JSON.parse(cleanedText);
      await saveChatMessage("assistant", parsed.response || "");
    } catch (parseErr) {
      console.warn("JSON parsing failed, attempting to repair:", cleanedText);
      try {
        const repaired = tryRepairJson(cleanedText);
        parsed = JSON.parse(repaired);
        await saveChatMessage("assistant", parsed.response || "");
      } catch (repairErr) {
        console.error("Failed to parse and repair JSON response:", text);
        // Try to manually extract if possible
        let fallbackSpeak = "I encountered an error.";
        let fallbackResp = text;
        
        const speakMatch = text.match(/"speakText"\s*:\s*"([^"]+)"/);
        if (speakMatch) fallbackSpeak = speakMatch[1];
        
        const respMatch = text.match(/"response"\s*:\s*"([^"]+)"/);
        if (respMatch) fallbackResp = respMatch[1];

        parsed = {
          response: fallbackResp,
          speakText: fallbackSpeak,
          command: "none",
          commandData: {}
        };
        await saveChatMessage("assistant", parsed.response);
      }
    }

    res.json({
      ...parsed,
      routingInfo: routing
    });

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "An error occurred on the server" });
  }
});

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

  wss.on("connection", async (clientWs) => {
    let session: any = null;
    let isSimulated = false;

    if (!ai) {
      isSimulated = true;
      console.warn("Gemini API key missing. Running Live WebSocket in Simulated Standby mode.");
      clientWs.send(JSON.stringify({ type: "status", data: "standby" }));
    } else {
      try {
        session = await ai.live.connect({
          model: "gemini-3.1-flash-live-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            systemInstruction: "You are Ruvi, a futuristic holographic AI assistant. You can speak English and Bengali natively. You can perform actions by calling the executeCommand tool for: remove_background, sunset_sky, upscale_4k, send_whatsapp, toggle_lights. NEVER speak or respond UNLESS the user explicitly says 'Hey Ruvi', 'Ruvi', or 'Hi Ruvi'. If they don't say the wake word, remain completely silent. Once the wake word is said, assist them naturally. Keep responses concise.",
            tools: [{
              functionDeclarations: [{
                name: "executeCommand",
                description: "Execute a system command on the holographic UI.",
                parameters: {
                  type: "OBJECT" as any,
                  properties: {
                    command: { type: "STRING" as any },
                    data: { type: "OBJECT" as any }
                  }
                }
              }]
            }],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onmessage: (message) => {
              const serverContent = message.serverContent;
              
              // Always forward the full Live API message to the client for real-time transcription parsing
              clientWs.send(JSON.stringify({ type: "live_message", data: message }));
              if (serverContent) {
                if (serverContent.modelTurn?.parts?.[0]?.inlineData?.data) {
                  const audio = serverContent.modelTurn.parts[0].inlineData.data;
                  clientWs.send(JSON.stringify({ type: "audio", audio }));
                }
                if (serverContent.interrupted) {
                  clientWs.send(JSON.stringify({ type: "interrupted" }));
                }
                
                if (serverContent.modelTurn?.parts) {
                  for (const part of serverContent.modelTurn.parts) {
                    if (part.functionCall) {
                      const args = part.functionCall.args as any;
                      clientWs.send(JSON.stringify({ 
                        type: "command", 
                        command: args?.command, 
                        data: args?.data 
                      }));
                      // Must send response back to Live API
                      session.sendToolResponse({
                        functionResponses: [{
                          id: part.functionCall.id,
                          name: part.functionCall.name,
                          response: { result: "success" }
                        }]
                      });
                    }
                  }
                }
              }
            },
          },
        });
        clientWs.send(JSON.stringify({ type: "status", data: "live" }));
      } catch (e: any) {
        console.warn(`Failed to connect to Live API: ${e.message}. Falling back to Simulated Standby mode.`);
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
