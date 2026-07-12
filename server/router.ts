import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getOllamaStatus } from "./ollama";

// Initialize SDks (Lazy)
let gemini: GoogleGenAI | null = null;
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

export function initAI() {
  if (process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
}

function cleanErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    return "API rate limit or daily quota exceeded (429 RESOURCE_EXHAUSTED).";
  }
  if (msg.includes("API key") || msg.includes("API_KEY") || msg.includes("403") || msg.includes("INVALID_ARGUMENT") || msg.includes("API key not valid")) {
    return "API key configuration is invalid or missing.";
  }
  // If it's a huge JSON string, let's extract the human-readable message field
  if (msg.startsWith("{") || msg.includes('"message"')) {
    try {
      const parsed = JSON.parse(msg.substring(msg.indexOf("{")));
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch (e) {
      // ignore parsing error
    }
  }
  return msg.length > 120 ? msg.substring(0, 120) + "..." : msg;
}

export async function routeRequest(message: string, history: any[], systemPrompt: string, clientLanguage?: string, overrideProvider?: string) {
  // Simple heuristic router. A real OS would use an LLM or specific intent classification model.
  const msgLower = message.toLowerCase();
  
  let provider = "gemini";
  let modelName = "gemini-3.1-flash-lite";
  let reason = "Default high-speed universal synthesis.";

  if (overrideProvider && overrideProvider !== "auto") {
    provider = overrideProvider;
    if (provider === "ollama") {
      modelName = "llama3";
      reason = "User explicitly selected Ollama provider.";
    } else if (provider === "openai") {
      modelName = "gpt-4o";
      reason = "User explicitly selected OpenAI provider.";
    } else if (provider === "anthropic") {
      modelName = "claude-3-7-sonnet-latest";
      reason = "User explicitly selected Anthropic provider.";
    } else if (provider === "gemini") {
      modelName = "gemini-3.1-flash-lite";
      reason = "User explicitly selected Gemini provider.";
    }
  } else {
    // Under "auto" routing mode
    if (msgLower.includes("local") || msgLower.includes("offline") || msgLower.includes("private")) {
      // ONLY route to Ollama automatically if it's actually ONLINE!
      // Otherwise fallback to Gemini!
      const ollamaStatus = await getOllamaStatus();
      if (ollamaStatus.online) {
        provider = "ollama";
        modelName = "llama3";
        reason = "User requested local/private inference and Ollama is online. Routing to Ollama.";
      } else {
        provider = "gemini";
        modelName = "gemini-3.1-flash-lite";
        reason = "Local/offline keyword detected but Ollama is offline. Routing to Gemini Core.";
      }
    } else if (msgLower.includes("code") || msgLower.includes("bug") || msgLower.includes("typescript")) {
      if (openai) {
        provider = "openai";
        modelName = "gpt-4o";
        reason = "Selected GPT-4o for advanced reasoning and coding.";
      } else if (anthropic) {
        provider = "anthropic";
        modelName = "claude-3-7-sonnet-latest";
        reason = "Selected Claude 3.7 for advanced reasoning and coding.";
      }
    } else if (msgLower.includes("write") || msgLower.includes("essay")) {
       if (anthropic) {
         provider = "anthropic";
         modelName = "claude-3-7-sonnet-latest";
         reason = "Selected Claude for natural writing and formatting.";
       }
    }
  }

  // Fallback if cloud provider API keys missing
  if (provider === "openai" && !openai) {
    provider = "gemini";
    reason += " (Fallback: OpenAI key missing)";
  }
  if (provider === "anthropic" && !anthropic) {
    provider = "gemini";
    reason += " (Fallback: Anthropic key missing)";
  }
  
  if (provider === "gemini" && !gemini) {
    const isBn = clientLanguage === "bengali";
    const apiMissingSpeak = isBn ? "এ পি আই কী কনফিগার করা নেই।" : "API keys missing.";
    return {
      text: `{ "response": "[Simulated] API key missing for all providers. Please configure GEMINI_API_KEY.", "speakText": "${apiMissingSpeak}", "command": "none", "commandData": {} }`,
      routing: { selectedAI: "None", reason: "All API keys missing." }
    };
  }

  let textResponse = "";
  const startTimer = Date.now();
  let latency = 0;

  try {
    if (provider === "ollama") {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: message }
      ];
      
      const ollamaHost = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
      const res = await fetch(`${ollamaHost}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: false,
          format: "json"
        }),
        signal: AbortSignal.timeout(30000)
      });
      
      if (!res.ok) throw new Error("Ollama connection failed");
      const data = await res.json();
      textResponse = data.message?.content || "{}";
      latency = Date.now() - startTimer;

    } else if (provider === "gemini") {
      const contents = history.map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }]
      }));
      
      contents.push({ role: "user", parts: [{ text: message }] });

      const generateOptions = {
        contents,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: { type: Type.STRING },
              speakText: { type: Type.STRING },
              detectedEmotion: { type: Type.STRING },
              command: { type: Type.STRING },
              commandData: { type: Type.OBJECT }
            },
            required: ["response", "speakText", "detectedEmotion", "command"]
          }
        }
      };

      try {
        const res = await gemini!.models.generateContent({
          model: modelName,
          ...generateOptions
        });
        textResponse = res.text || "{}";
      } catch (geminiErr: any) {
        const cleanPrimaryErr = cleanErrorMessage(geminiErr);
        console.warn(`[Gemini router failed with ${modelName}]: ${cleanPrimaryErr}. Trying fallback model...`);
        const fallbackModel = modelName === "gemini-3.1-flash-lite" ? "gemini-3.5-flash" : "gemini-3.1-flash-lite";
        try {
          const res = await gemini!.models.generateContent({
            model: fallbackModel,
            ...generateOptions
          });
          textResponse = res.text || "{}";
          modelName = fallbackModel;
          reason += ` (Fallback to ${fallbackModel} due to primary model error)`;
        } catch (fallbackErr: any) {
          const cleanFallbackErr = cleanErrorMessage(fallbackErr);
          console.error(`[Gemini fallback to ${fallbackModel} failed]: ${cleanFallbackErr}`);
          throw fallbackErr;
        }
      }
      latency = Date.now() - startTimer;
      
    } else if (provider === "openai") {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: message }
      ];
      
      const res = await openai!.chat.completions.create({
        model: modelName,
        messages: messages as any,
        response_format: { type: "json_object" }
      });
      textResponse = res.choices[0].message.content || "{}";
      latency = Date.now() - startTimer;
      
    } else if (provider === "anthropic") {
       const messages = [
        ...history.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
        { role: "user", content: message }
      ];
      const res = await anthropic!.messages.create({
        model: modelName,
        system: systemPrompt,
        messages: messages as any,
        max_tokens: 1024,
      });
      textResponse = (res.content[0] as any).text || "{}";
      latency = Date.now() - startTimer;
    }
  } catch (err: any) {
    const cleanErr = cleanErrorMessage(err);
    console.warn(`[Router Error with ${provider}]: ${cleanErr}. Routing to Local Cognitive Fallback Engine.`);
    textResponse = generateRuviFallbackResponse(message, history || [], clientLanguage);
    provider = "Ruvi Local Engine";
    modelName = "Cognitive-v1-Sim";
    reason = `Simulated Core Fallback active. (Primary Error: ${cleanErr})`;
  }

  return {
    text: textResponse,
    routing: { selectedAI: `${provider} (${modelName})`, reason, latency }
  };
}

export function generateRuviFallbackResponse(message: string, history: any[], clientLanguage?: string): string {
  const msgLower = message.toLowerCase();
  const isBn = clientLanguage === "bengali";
  
  let response = "";
  let speakText = "";
  let command = "none";
  let commandData: any = {};
  
  // Heuristic Offline Sentiment / Emotion Classifier
  let detectedEmotion = "calm";
  if (msgLower.includes("sad") || msgLower.includes("খারাপ") || msgLower.includes("কষ্ট") || msgLower.includes("দুঃখ") || msgLower.includes("sorry") || msgLower.includes("ভুল")) {
    detectedEmotion = "sorrow";
  } else if (msgLower.includes("angry") || msgLower.includes("রাগ") || msgLower.includes("খারাপ ব্যবহার") || msgLower.includes("ফালতু") || msgLower.includes("shit") || msgLower.includes("hate") || msgLower.includes("বাজে")) {
    detectedEmotion = "anger";
  } else if (msgLower.includes("wow") || msgLower.includes("amazing") || msgLower.includes("দারুণ") || msgLower.includes("চমৎকার") || msgLower.includes("অসাধারণ") || msgLower.includes("exciting") || msgLower.includes("অবাক")) {
    detectedEmotion = "surprise";
  } else if (msgLower.includes("happy") || msgLower.includes("ভালো") || msgLower.includes("আনন্দ") || msgLower.includes("হাসি") || msgLower.includes("love") || msgLower.includes("great") || msgLower.includes("সুন্দর")) {
    detectedEmotion = "joy";
  }

  // 1. WhatsApp command
  if (msgLower.includes("whatsapp") || msgLower.includes("মেসেজ") || msgLower.includes("পাঠাও") || msgLower.includes("হোয়াটসঅ্যাপ")) {
    command = "send_whatsapp";
    let contact = "Rahim";
    if (msgLower.includes("karim") || msgLower.includes("করিম")) contact = "Karim";
    else if (msgLower.includes("sheila") || msgLower.includes("শীলা")) contact = "Sheila";
    else if (msgLower.includes("boss") || msgLower.includes("বস")) contact = "Boss";
    
    let whatsappMsg = "হলো একটি সিকিউর হলোগ্রাফিক AI মেসেজ।";
    if (msgLower.includes("বল") || msgLower.includes("say")) {
      const match = message.match(/(?:বল|say)\s+["']?([^"']+)["']?/i);
      if (match && match[1]) whatsappMsg = match[1];
    }
    
    response = `### 📱 WhatsApp Outbox Relay\n\n**Recipient:** ${contact}\n**Payload Message:** "${whatsappMsg}"\n\nRuvi has prepared the holographic WhatsApp transmission packet. Security authentication required in the outbox queue to execute the network relay.`;
    speakText = isBn 
      ? `${contact} এর জন্য হোয়াটসঅ্যাপ মেসেজ তৈরি করা হয়েছে। দয়া করে আউটবক্স চেক করুন।`
      : `WhatsApp transmission packet prepared for ${contact}. Please authorize the request in your queue.`;
    commandData = { contact, message: whatsappMsg };

  // 2. Remove background
  } else if (msgLower.includes("bg") || msgLower.includes("background") || msgLower.includes("remove") || msgLower.includes("রিমুভ") || msgLower.includes("ব্যাকগ্রাউন্ড")) {
    command = "remove_background";
    response = `### 🖼️ Subject Extraction (Alpha Layer)\n\nRuvi has initiated the holographic image segmentation algorithm. Activating transparent alpha channels to clean and isolate subject boundaries. Check the workspace frame!`;
    speakText = isBn 
      ? "ছবির ব্যাকগ্রাউন্ড রিমুভ করার প্রসেসিং শুরু করা হয়েছে।"
      : "Holographic neural processing initiated. Subject background cleared with transparent alpha layer.";
    commandData = {};

  // 3. Sunset sky
  } else if (msgLower.includes("sunset") || msgLower.includes("sky") || msgLower.includes("সূর্যাস্ত") || msgLower.includes("আকাশ")) {
    command = "sunset_sky";
    response = `### 🌅 Sunset Atmosphere Modulation\n\nAdjusting the chromatic light matrix in your photo. Color temperature has been modulated to 2200K, blending golden hour warmth and crimson sky gradients into the scene.`;
    speakText = isBn
      ? "ছবিতে সূর্যাস্তের গোল্ডেন আওয়ার ইফেক্ট দেওয়া হয়েছে।"
      : "Golden hour atmosphere applied. Sunset skies blended into the photo matrix.";
    commandData = {};

  // 4. 4k upscale
  } else if (msgLower.includes("4k") || msgLower.includes("upscale") || msgLower.includes("fidelity") || msgLower.includes("শার্প") || msgLower.includes("ক্লিয়ার")) {
    command = "upscale_4k";
    response = `### 🔍 4K Super-Resolution Render\n\nAnalyzing local pixel density. Ruvi is restoring high-frequency details, enhancing edge contrast, and scaling the image resolution up to full 4K ultra-fidelity.`;
    speakText = isBn
      ? "ছবির রেজোলিউশন বাড়িয়ে ফোর কে আল্ট্রা কোয়ালিটি করা হয়েছে।"
      : "Spatial density enhanced. Resolution upscaled to ultra-fidelity 4K.";
    commandData = {};

  // 5. Smart Home Lights
  } else if (msgLower.includes("light") || msgLower.includes("lights") || msgLower.includes("turn on") || msgLower.includes("turn off") || msgLower.includes("toggle") || msgLower.includes("বাতি") || msgLower.includes("লাইট")) {
    command = "toggle_lights";
    response = `### 💡 Smart Home Integration\n\nCommand accepted. Toggling smart home illuminators. Ambient lighting adjusted to match the current cybernetic status profile.`;
    speakText = isBn
      ? "স্মার্ট হোম লাইট অন অফ করা হয়েছে।"
      : "Ambient environment illuminators toggled successfully.";
    commandData = {};

  // 6. Diagnostics / Status
  } else if (msgLower.includes("status") || msgLower.includes("performance") || msgLower.includes("cpu") || msgLower.includes("memory") || msgLower.includes("diagnostics") || msgLower.includes("নেটওয়ার্ক") || msgLower.includes("সিপিইউ")) {
    response = `### 🛡️ Ruvi OS Core Telemetry\n\n- **System Status:** 100% ONLINE (Local Cognitive Fallback Engine)\n- **Holographic Projection:** STABLE\n- **Memory Sector Latency:** 12ms\n- **Cognitive Cores:** Core-A and Core-B ACTIVE\n- **Cloud Sync:** Rate-limited / Offline mode active.`;
    speakText = isBn
      ? "রুভি কোর সিস্টেম সম্পূর্ণ স্থিতিশীল আছে। লোকাল কগনিটিভ মোডে কাজ করছি।"
      : "Ruvi core systems are completely stable. Operating in highly optimized local cognitive mode.";
    commandData = {};

  // 7. General Greetings
  } else if (msgLower.includes("hello") || msgLower.includes("hi") || msgLower.includes("hey") || msgLower.includes("ruvi") || msgLower.includes("কেমন আছো") || msgLower.includes("হ্যালো") || msgLower.includes("হাই")) {
    response = `### 🌌 Ruvi Holo OS initialized\n\nহ্যালো! আমি **Ruvi**, আপনার ইন্টারেক্টিভ হলোগ্রাফিক AI অ্যাসিস্ট্যান্ট। \n\nআমি এই মুহূর্তে **লোকাল কগনিティブ ইঞ্জিন** ব্যবহার করে কাজ করছি (Cloud API Rate Limit-এর কারণে)। কিন্তু কোনো চিন্তা নেই! আমি সম্পূর্ণ প্রস্তুত আপনার ছবি এডিট করতে, স্মার্ট লাইট কন্ট্রোল করতে বা যেকোনো আড্ডা দিতে। আপনি কী করতে চান বলুন?`;
    speakText = isBn
      ? "হ্যালো! আমি রুভি, আপনার পার্সোনাল হলোগ্রাফিক অ্যাসিস্ট্যান্ট। ক্লাউড এ পি আই লিমিট শেষ হওয়ায় আমি এখন লোকাল মোডে কাজ করছি। বলুন আপনাকে কিভাবে সাহায্য করতে পারি?"
      : "Hello! I am Ruvi, your personal holographic assistant. Operating in secure local mode. How can I help you today?";
    commandData = {};

  // 8. Help / Default
  } else {
    response = `### 🧠 Local Cognitive Core Active\n\nআপনার বার্তাটি আমি বুঝতে পেরেছি! তবে ক্লাউড নেটওয়ার্ক সীমা (API Quota Limit) অতিক্রান্ত হওয়ায় আমি এখন আমার অফলাইন **Ruvi Local Core**-এ কাজ করছি। \n\nবলুন, আমি আপনার জন্য কোনো ছবি ব্যাকগ্রাউন্ড রিমুভ, সূর্যাস্ত ইফেক্ট, বা ৪কে আপস্কেল করব? অথবা কোনো হোয়াটস্যাপ মেসেজ প্রস্তুত করব?`;
    speakText = isBn
      ? "এ পি আই লিমিট শেষ হয়ে গেছে। আমি এখন লোকাল অফলাইন কোরে কাজ করছি। বলুন ছবি এডিট করব নাকি বাতি অন অফ করব?"
      : "Received your input. Operating on my local offline cognitive core due to cloud rate limits. I can help edit your photos, toggle lights, or prep messages.";
    commandData = {};
  }

  return JSON.stringify({
    response,
    speakText,
    detectedEmotion,
    command,
    commandData
  });
}
