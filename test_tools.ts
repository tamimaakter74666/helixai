import { registerAllTools } from "./server/core/ToolsRegistration";
import { registry } from "./server/core/Registry";

registerAllTools();
console.log("Registered Tools:", registry.getFunctionDeclarations());
