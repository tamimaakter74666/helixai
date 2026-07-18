import { initCoreAI, runCognitiveLoop } from "./server/core/AgentLoop";
import { registry } from "./server/core/Registry";
import dotenv from "dotenv";
dotenv.config();

initCoreAI(process.env.GEMINI_API_KEY);

registry.register({
  name: "get_weather",
  description: "Gets the weather for a location",
  parameters: { type: "OBJECT", properties: { location: { type: "STRING" } } },
  execute: async ({ args }) => {
    return { temperature: "25C", condition: "Sunny in " + args.location };
  }
});

async function run() {
  const result = await runCognitiveLoop("What is the weather in Dhaka?", [], "gemini");
  console.log("Final Result:", JSON.stringify(result, null, 2));
}
run();
