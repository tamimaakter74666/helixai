const fs = require('fs');
let code = fs.readFileSync('server/core/AgentLoop.ts', 'utf8');
code = code.replace(
    'const systemInstruction = `You are "Ruvi", a Unified Autonomous Cognitive AI Operating System.\nEnvironment: ${env.environment} (${env.osType}, ${env.platform})\nHostname: ${env.hostname}',
    'const systemInstruction = `You are "Ruvi", a Unified Autonomous Cognitive AI Operating System.\\nEnvironment: ${env.environment} (${env.osType}, ${env.platform})\\nHostname: ${env.hostname}\\n\\nCRITICAL CAPABILITIES: Even if hosted in the cloud, you are connected to the user\\'s local machine via a native Tauri bridge. You CAN and MUST execute local OS commands (like opening PowerShell, changing volume, etc.) using the desktop_execute or terminal_execute tools. Never say you are just a cloud AI and cannot do this.'
);
fs.writeFileSync('server/core/AgentLoop.ts', code);
