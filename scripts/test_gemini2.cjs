const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      config: {
        systemInstruction: "You are a helpful assistant",
        responseMimeType: "application/json"
      }
    });
    console.log(res.text);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
run();
