const fs = require('fs');

const fullCode = `import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import os from "os";
import si from "systeminformation";
import { initDb, saveChatMessage, getChatHistory } from "./server/db";
import { initAI, routeRequest } from "./server/router";

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
    const [cpuLoad, mem, graphics, network] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.graphics(),
      si.networkStats()
    ]);

    const cpuUsage = cpuLoad.currentLoad;
    const totalMemGB = (mem.total / (1024 ** 3)).toFixed(1);
    const usedMemPercent = (mem.active / mem.total) * 100;
    
    // Attempt to get GPU load if available, otherwise fallback to 0
    let gpuUsage = 0;
    if (graphics.controllers && graphics.controllers.length > 0) {
      // Some controllers report utilization
      const gpu = graphics.controllers[0];
      gpuUsage = gpu.utilizationGpu || (gpu.memoryUsed && gpu.memoryTotal) ? (gpu.memoryUsed! / gpu.memoryTotal!) * 100 : 0;
    }
    
    // Calculate a rough ping/latency if possible, or use response time
    const networkLatency = await si.inetLatency();
    
    res.json({
      cpuUsage,
      memoryUsage: usedMemPercent,
      totalMemGB,
      networkLatency: networkLatency || 0,
      platform: os.platform(),
      gpuUsage,
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

// AI Brain Router API
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Save user message to persistent SQLite memory
    await saveChatMessage("user", message);

    const systemPrompt = \`You are "Ruvi", a futuristic, premium, holographic AI assistant and Operating System with a sleek Sci-Fi persona.
You must speak naturally in Bengali (বাংলা), English, or "Banglish". Match the user's language and tone.
Your core capabilities include:
1. Advanced Voice Chat
2. Image / Screen Analysis
3. Workflow Automation

You MUST respond strictly in valid JSON format. Your response MUST be a single JSON object with these keys:
- "response": The markdown text response to show in the chat screen.
- "speakText": A clean, simple text-only version of the response (without markdown) to be spoken out loud by the TTS system. Keep it concise.
- "command": String key of any command detected. It must be one of:
  - "remove_background", "sunset_sky", "upscale_4k", "send_whatsapp", "toggle_lights", "none"
- "commandData": An object containing parameters for the command, e.g.:
  - For "send_whatsapp": { "contact": "Rahim", "message": "Hi Rahim, how are you?" }
  - For others: {}

Provide ONLY the JSON object. Do not wrap it in markdown code blocks like \\\`\\\`\\\`json. Return pure raw JSON string.\`;

    // Use Central Model Router
    const { text, routing } = await routeRequest(message, history || [], systemPrompt);

    let parsed;
    try {
      parsed = JSON.parse(text);
      // Save assistant response to DB
      await saveChatMessage("assistant", parsed.response || "");
    } catch (parseErr) {
      console.error("Failed to parse JSON response:", text);
      parsed = {
        response: text,
        speakText: text.replace(/[#*_\\\\\`]/g, ""),
        command: "none",
        commandData: {}
      };
      await saveChatMessage("assistant", parsed.response);
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
  try {
    const { prompt, aspectRatio } = req.body;
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is missing. Cannot generate images." });
    }
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
          imageUrl = \`data:image/png;base64,\${base64Data}\`;
          break;
        }
      }
    }
    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      res.status(500).json({ error: "No image data was generated by the model." });
    }
  } catch (err: any) {
    console.error("Error generating image:", err);
    res.status(500).json({ error: err.message || "Failed to generate image" });
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Ruvi Server running on http://0.0.0.0:\${PORT}\`);
  });
}
initServer();
`;

fs.writeFileSync('server.ts', fullCode);
