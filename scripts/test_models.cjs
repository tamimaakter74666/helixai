const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.list().then(res => {
  for (const m of res) {
    if (m.name.includes("gemini")) {
      console.log(m.name);
    }
  }
}).catch(console.error);
