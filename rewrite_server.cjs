const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const importOllama = `import { getOllamaStatus } from "./server/ollama";\n`;

code = code.replace(`import { initAI, routeRequest } from "./server/router";`, `import { initAI, routeRequest } from "./server/router";\n${importOllama}`);

const newSysRoute = `
// System telemetry API
app.get("/api/system", async (req, res) => {
  try {
    const [cpuLoad, mem, graphics, network, ollama] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.graphics(),
      si.networkStats(),
      getOllamaStatus()
    ]);

    const cpuUsage = cpuLoad.currentLoad;
    const totalMemGB = (mem.total / (1024 ** 3)).toFixed(1);
    const usedMemPercent = (mem.active / mem.total) * 100;
    
    // Attempt to get GPU load if available, otherwise fallback to 0
    let gpuUsage = 0;
    if (graphics.controllers && graphics.controllers.length > 0) {
      // Some controllers report utilization
      const gpu = graphics.controllers[0];
      gpuUsage = gpu.utilizationGpu || (gpu.memoryUsed && gpu.memoryTotal) ? (gpu.memoryUsed / gpu.memoryTotal) * 100 : 0;
    }
    
    // Calculate a rough ping/latency if possible, or use response time
    const networkLatency = await si.inetLatency();
    
    res.json({
      cpuUsage,
      memoryUsage: usedMemPercent,
      totalMemGB,
      networkLatency: networkLatency || 0,
      platform: os.platform(),
      gpuUsage,
      ollama
    });
  } catch (err) {
    console.error("System telemetry error:", err);
    res.status(500).json({ error: "Failed to read system telemetry" });
  }
});
`;

code = code.replace(/\/\/ System telemetry API[\s\S]*?\}\);/, newSysRoute.trim());

fs.writeFileSync('server.ts', code);
