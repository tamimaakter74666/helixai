import { initAI, gemini } from "./server/router.js";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  initAI();
  if (gemini) {
    const response = await gemini.models.list({});
    for await (const m of response) {
      if (m.name.includes("flash") || m.name.includes("lite") || m.name.includes("3.1")) {
        console.log(m.name);
      }
    }
  }
}
main().catch(console.error);
