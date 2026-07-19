import fs from "fs";
const serverCode = fs.readFileSync("server.ts", "utf8");
const prodCode = serverCode.replace(
  /if \(process\.env\.NODE_ENV !== "production"\) \{[\s\S]*?\} else \{([\s\S]*?)\}/,
  `$1`
);
fs.writeFileSync("server.prod.tmp.ts", prodCode);
