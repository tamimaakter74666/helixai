import fs from "fs";

let code = fs.readFileSync("server/core/ToolsRegistration.ts", "utf8");
code = code.replace(
  /params: { type: "OBJECT" }/,
  `params: { type: "OBJECT", description: "e.g. { level: 50 } for volume_set" }`
);
fs.writeFileSync("server/core/ToolsRegistration.ts", code);
console.log("Registry params fixed");
