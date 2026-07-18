import fs from "fs";

let chatCode = fs.readFileSync("chat.ts", "utf8");
chatCode = chatCode.replace(
  /const { text, routing } = await routeRequest\(message, history \|\| \[\], systemPrompt, language, provider, modelName\);/,
  `// Pass through Unified Cognitive Core
    const finalJson = await runCognitiveLoop(message, history || [], provider || "gemini");
    const text = JSON.stringify(finalJson);
    const routing = { selectedAI: provider || "gemini", latency: 0, reason: "Unified Cognitive Core" };
  `
);
chatCode = chatCode.replace(
  /import { routeRequest } from "\.\/server\/router";/,
  `import { routeRequest } from "./server/router";\nimport { runCognitiveLoop } from "./server/core/AgentLoop";`
);
fs.writeFileSync("chat.ts", chatCode);
console.log("chat.ts updated");
