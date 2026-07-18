const fs = require('fs');
const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const serverContent = message.serverContent;',
  'const serverContent = message.serverContent;\n            const clientContent = message.clientContent;\n            \n            if (clientContent) {\n              clientWs.send(JSON.stringify({ type: "live_message", data: message }));\n            }'
);

fs.writeFileSync(file, code);
