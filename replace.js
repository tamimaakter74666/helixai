const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newRouter = `// Initialize Subsystems
import { initDb, saveChatMessage, getChatHistory } from "./server/db";
import { initAI, routeRequest } from "./server/router";

initDb();
initAI();

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
        speakText: text.replace(/[#*_\\`]/g, ""),
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
});`;

// Find index of "// Initialize GoogleGenAI server-side with named parameter and user-agent"
const startIndex = code.indexOf('// Initialize GoogleGenAI server-side with named parameter and user-agent');
const endIndex = code.indexOf('// Image Generation Proxy');

if (startIndex > -1 && endIndex > -1) {
  code = code.substring(0, startIndex) + newRouter + "\n\n" + code.substring(endIndex);
  
  // add imports
  code = code.replace('import si from "systeminformation";', 'import si from "systeminformation";\nimport { initDb, saveChatMessage, getChatHistory } from "./server/db";\nimport { initAI, routeRequest } from "./server/router";');
  fs.writeFileSync('server.ts', code);
  console.log("Successfully replaced router in server.ts");
} else {
  console.log("Could not find markers.");
}
