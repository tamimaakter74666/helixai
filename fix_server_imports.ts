import fs from "fs";

let serverCode = fs.readFileSync("server.ts", "utf8");
serverCode = serverCode.replace(
  /import { initCoreAI } from "\.\/server\/core\/AgentLoop";/,
  `import { initCoreAI, runCognitiveLoop } from "./server/core/AgentLoop";`
);
fs.writeFileSync("server.ts", serverCode);
console.log("Imports fixed");
