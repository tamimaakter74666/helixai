app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, language, provider, modelName } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Save user message to persistent SQLite memory
    await saveChatMessage("user", message);

    // Fetch current memories to inject into system prompt
    const currentMemories = await getMemories(50) as any[];
    const memoryString = currentMemories.length > 0 
      ? `\n\nLONG-TERM MEMORY (Use these to personalize responses):\n` + currentMemories.map(m => `- [${m.type}] ${m.content}`).join("\n") 
      : "";

    const systemPrompt = `You are "Ruvi", a futuristic, premium, holographic AI assistant and Operating System with a sleek Sci-Fi persona.
You must speak naturally in Bengali (বাংলা), English, or "Banglish". Match the user's language and tone.
Your core capabilities include:
1. Advanced Voice Chat
2. Image / Screen Analysis & OCR
3. Workflow Automation
4. Direct Windows/Desktop Control & File Management (Automatically executed)${memoryString}

If the user is telling you highly personal information or secrets, proactively ask if you should save this to your long-term memory for future reference.

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
    // Pass through Unified Cognitive Core
    const finalJson = await runCognitiveLoop(message, history || [], provider || "gemini");
    const text = JSON.stringify(finalJson);
    const routing = { selectedAI: provider || "gemini", latency: 0, reason: "Unified Cognitive Core" };
  

    let parsed;
    // Clean text safely without mangling closing braces
    const cleanedText = text.replace(/^\s*```json\n?/, '').replace(/\n?```\s*$/, '').trim();
    
    try {
      // Strategy 1: Attempt standard direct parse
      parsed = JSON.parse(cleanedText);
      await saveChatMessage("assistant", parsed.response || "");
      
      // Save system log for successful routing
      saveSystemLog({
        level: "success",
        category: "model",
        message: `Routed query to ${routing.selectedAI || provider || "Default"}.`,
        details: `Latency: ${routing.latency || 0}ms. Prompt: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`
      });
    } catch (parseErr) {
      // console.log("JSON parsing failed directly. Trying balanced extractor...");
      let parsedSuccessfully = false;
      
      // Strategy 2: Extract balanced JSON block to handle trailing code blocks, comments, or annotations
      const balanced = extractBalancedJson(cleanedText);
      if (balanced) {
        try {
          parsed = JSON.parse(balanced);
          await saveChatMessage("assistant", parsed.response || "");
          parsedSuccessfully = true;
          
          saveSystemLog({
            level: "success",
            category: "model",
            message: `Routed query to ${routing.selectedAI || provider || "Default"} (Extracted via Balanced Parser).`,
            details: `Latency: ${routing.latency || 0}ms. Successfully isolated valid JSON object.`
          });
        } catch (balancedErr) {
          // console.log("Balanced JSON parse failed.");
        }
      }
      
      if (!parsedSuccessfully) {
        // Strategy 3: Try repair utility (closing truncated fields/braces)
        try {
          const repaired = tryRepairJson(cleanedText);
          parsed = JSON.parse(repaired);
          await saveChatMessage("assistant", parsed.response || "");
          
          // Log the JSON warning and successful repair
          saveSystemLog({
            level: "warning",
            category: "model",
            message: `Model response JSON repaired.`,
            details: `Router fallback was activated due to trailing/missing tokens. Repaired successfully.`
          });
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
          
          // Log the JSON parse failure as error
          saveSystemLog({
            level: "error",
            category: "model",
            message: `Failed to parse AI response JSON. Falling back to raw response.`,
            details: `Error: ${(repairErr as Error).message}. Raw output length: ${text.length} chars.`
          });
        }
      }
    }

    res.json({
      ...parsed,
      routingInfo: routing
    });

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    
    // Log the API route failure
    saveSystemLog({
      level: "error",
      category: "model",
      message: `AI route error: ${error.message || "Unknown error"}`,
      details: error.stack || ""
    });
    
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

  wss.on("connection", async (clientWs, request) => {
    let session: any = null;
    let isSimulated = false;

    const urlString = request ? (request.url || "") : "";
    const urlObj = new URL(urlString, "http://localhost");
    const sessionId = urlObj.searchParams.get("sessionId") || "unknown";

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
              clientWs.send(JSON.stringify({ type: "live_message", data: message, sessionId }));
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
