import fs from "fs";

let code = fs.readFileSync("server/core/AgentLoop.ts", "utf8");
code = code.replace(
  /Backend Tools \(executed immediately by you in the backend\):/,
  `Backend Tools (executed immediately by you in the backend):`
);

// We need to emphasize that the command name MUST be exactly the tool name.
code = code.replace(
  /JSON SCHEMA:/,
  `CRITICAL: The 'command' field in backendToolsToExecute MUST exactly match one of the Backend Tools names listed above. For example, use 'desktop_execute' with action 'volume_set', DO NOT use 'volume_set' directly as the tool name.

JSON SCHEMA:`
);

fs.writeFileSync("server/core/AgentLoop.ts", code);
console.log("AgentLoop prompt fixed");
