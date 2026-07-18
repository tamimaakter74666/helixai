import fs from "fs";

let serverCode = fs.readFileSync("server.ts", "utf8");

// Find the block from app.post("/api/chat" to the end of that route
// It starts at around line 406. We'll replace the inside of it.

const newChatRoute = `app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, language, provider, modelName } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Save user message to persistent SQLite memory
    await saveChatMessage("user", message);

    const finalJson = await runCognitiveLoop(message, history || [], provider || "gemini");
    const routingInfo = { selectedAI: provider || "gemini", latency: 0, reason: "Unified Cognitive Core" };
    
    finalJson.routingInfo = routingInfo;
    await saveChatMessage("assistant", finalJson.response || "");

    res.json(finalJson);
  } catch (err: any) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: err.message || "Failed to process chat request" });
  }
});
`;

// Replace the old app.post("/api/chat") block
const startIdx = serverCode.indexOf('app.post("/api/chat"');
if (startIdx !== -1) {
  // Find the closing brace of the app.post block
  let braceCount = 0;
  let endIdx = -1;
  let started = false;
  for (let i = startIdx; i < serverCode.length; i++) {
    if (serverCode[i] === '{') {
      braceCount++;
      started = true;
    } else if (serverCode[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        endIdx = i + 2; // include ");"
        break;
      }
    }
  }
  
  if (endIdx !== -1) {
    serverCode = serverCode.substring(0, startIdx) + newChatRoute + serverCode.substring(endIdx);
    fs.writeFileSync("server.ts", serverCode);
    console.log("Replaced chat route in server.ts");
  } else {
    console.log("Could not find end of chat route");
  }
}

