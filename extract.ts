app.post("/api/memory/extract", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key missing" });
    }
    
    // Get recent chat history and current memories
    const history = await getChatHistory(10) as any[];
    const currentMemories = await getMemories(50) as any[];
    
    if (history.length === 0) {
      return res.json({ success: true, processed: 0 });
    }

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
      model: "gemini-3.1-flash",
      contents: { parts: [{ text: extractionPrompt }] }
    });

    let text = response.text || "";
    let parsed: any = { add: [], update: [], delete: [] };
    
    try {
      const cleaned = text.replace(/^\\s*\`\`\`json\\n?/, '').replace(/\\n?\`\`\`\\s*$/, '').trim();
      const balanced = extractBalancedJson(cleaned) || tryRepairJson(cleaned);
      parsed = JSON.parse(balanced);
    } catch (e) {
      // console.log("Memory extraction JSON parse failed.");
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
        message: "Cognitive Memory Synthesis completed.",
        details: "Processed " + processed + " memory operations based on recent context."
      });
    }

    res.json({ success: true, processed, actions: parsed });
  } catch (err: any) {
    console.error("Error extracting memory:", err);
    res.status(500).json({ error: err.message });
  }
});

// AI Brain Router API
app.post("/api/chat", async (req, res) => {
