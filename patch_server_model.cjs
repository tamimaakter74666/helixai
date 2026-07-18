const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `model: "gemini-3.5-flash",`;
const replacement = `model: "gemini-1.5-flash",`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with gemini-1.5-flash");
