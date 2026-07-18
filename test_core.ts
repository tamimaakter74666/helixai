import { detectEnvironment } from "./server/core/Environment";
import { registry } from "./server/core/Registry";
import fs from "fs";

// Fix missing fs in Environment.ts
const envFile = fs.readFileSync("server/core/Environment.ts", "utf8");
if(!envFile.includes("import fs from")) {
    fs.writeFileSync("server/core/Environment.ts", "import fs from 'fs';\n" + envFile);
}

console.log("Environment:", detectEnvironment());

registry.register({
  name: "test_tool",
  description: "A test tool",
  parameters: { type: "OBJECT", properties: {} },
  execute: async () => ({ status: "success" })
});

console.log("Tools:", registry.getFunctionDeclarations());
