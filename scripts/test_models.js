const { GoogleGenAI } = require("@google/genai");
async function main() {
  const ai = new GoogleGenAI();
  const models = await ai.models.list();
  for await (const m of models) {
    console.log(m.name);
  }
}
main().catch(console.error);
