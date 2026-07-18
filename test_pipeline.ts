import { pipeline } from "./server/core/Pipeline";
import { registry } from "./server/core/Registry";

registry.register({
  name: "analyze_system",
  description: "Analyzes system state",
  parameters: { type: "OBJECT", properties: {} },
  execute: async () => ({ status: "success" })
});

async function run() {
  const res = await pipeline.process({
    message: "Check system state",
    history: []
  });
  console.log(JSON.stringify(res, null, 2));
}
run();
