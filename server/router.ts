import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getOllamaStatus, getBestOllamaModel, scoreModelForTask } from "./ollama";
import { saveModelMetric } from "./db";

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string = "Request timed out"): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function tryAllOllamaModels(
  systemPrompt: string,
  history: any[],
  message: string,
  task: string,
  preferredModelName: string,
  timeoutMs: number = 120000
): Promise<{ success: boolean; modelName: string; textResponse: string; reason: string; latency: number }> {
  const startTimer = Date.now();
  const ollamaHost = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
  const url = `${ollamaHost}/api/chat`;

  const ollamaMessages = [
    { role: "system", content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: message }
  ];

  // Fetch Ollama status to get list of all models
  const status = await getOllamaStatus();
  if (!status.online) {
    console.warn(`[Ollama Offline]: Cannot proceed with local Ollama models. Host: ${ollamaHost}`);
    return { success: false, modelName: preferredModelName, textResponse: "", reason: "Ollama host is offline", latency: 0 };
  }

  // Gather list of models: start with preferredModelName, then alternatives
  // Alternatives should be sorted by suitability score for the task
  const allModels = status.models;
  const scoredModels = allModels.map(m => ({
    name: m.name,
    score: scoreModelForTask(m, task)
  })).sort((a, b) => b.score - a.score);

  // Filter out preferredModelName from alternative list if it's there
  const preferredModelLower = preferredModelName.toLowerCase();
  const sortedAlternativeNames = scoredModels
    .map(m => m.name)
    .filter(name => name.toLowerCase() !== preferredModelLower);

  // The full sequence of models to attempt
  const attemptSequence = [preferredModelName, ...sortedAlternativeNames];

  console.log(`[Ollama Routing] Model attempt sequence: ${JSON.stringify(attemptSequence)}`);

  for (let i = 0; i < attemptSequence.length; i++) {
    const currentModel = attemptSequence[i];
    
    // Verify that currentModel is actually an installed model (or if it's the preferred one, we try it regardless)
    const isInstalled = allModels.some(m => m.name === currentModel || m.model === currentModel || m.name.split(":")[0] === currentModel.split(":")[0]);
    if (i > 0 && !isInstalled) {
      console.log(`[Ollama Routing] Skipping uninstalled alternative model: ${currentModel}`);
      continue;
    }

    const requestBody = {
      model: currentModel,
      messages: ollamaMessages,
      stream: true,
      format: "json",
      keep_alive: "30m"
    };

    console.log(`[Ollama Attempt ${i + 1}/${attemptSequence.length}]`);
    console.log(`- Request URL: ${url}`);
    console.log(`- Selected Model: ${currentModel}`);
    console.log(`- Timeout Value: ${timeoutMs}ms`);
    console.log(`- Keep Alive: 30m`);
    console.log(`- Connection Reuse: Enabled`);
    console.log(`- Request Body:\n${JSON.stringify(requestBody, null, 2)}`);

    try {
      const attemptStart = Date.now();
      const res = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Connection": "keep-alive"
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs)
      });

      console.log(`- Response Status: ${res.status} ${res.statusText}`);

      const modelObj = allModels.find(m => m.name === currentModel || m.model === currentModel);
      const memorySizeGB = modelObj ? (modelObj.size / (1024 ** 3)) : 0;

      if (res.ok) {
        let textResponse = "";
        let firstTokenTime = 0;
        let firstChunkReceived = false;

        let modelLoadTimeMs = 0;
        let promptEvalTimeMs = 0;
        let generationTimeMs = 0;
        let tokenCount = 0;

        const reader = typeof res.body?.getReader === "function" ? res.body.getReader() : null;

        if (reader) {
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (!firstChunkReceived) {
              firstChunkReceived = true;
              firstTokenTime = Date.now();
            }

            buffer += decoder.decode(value || new Uint8Array(), { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const chunk = JSON.parse(line);
                if (chunk.message?.content) {
                  textResponse += chunk.message.content;
                }
                if (chunk.done) {
                  if (chunk.load_duration !== undefined) {
                    modelLoadTimeMs = chunk.load_duration / 1000000;
                  }
                  if (chunk.prompt_eval_duration !== undefined) {
                    promptEvalTimeMs = chunk.prompt_eval_duration / 1000000;
                  }
                  if (chunk.eval_duration !== undefined) {
                    generationTimeMs = chunk.eval_duration / 1000000;
                  }
                  if (chunk.eval_count !== undefined) {
                    tokenCount = chunk.eval_count;
                  }
                }
              } catch (e) {
                // Ignore partial JSON parse errors
              }
            }
          }

          // Read remainder of buffer
          if (buffer.trim()) {
            try {
              const chunk = JSON.parse(buffer);
              if (chunk.message?.content) {
                textResponse += chunk.message.content;
              }
              if (chunk.done) {
                if (chunk.load_duration !== undefined) modelLoadTimeMs = chunk.load_duration / 1000000;
                if (chunk.prompt_eval_duration !== undefined) promptEvalTimeMs = chunk.prompt_eval_duration / 1000000;
                if (chunk.eval_duration !== undefined) generationTimeMs = chunk.eval_duration / 1000000;
                if (chunk.eval_count !== undefined) tokenCount = chunk.eval_count;
              }
            } catch (e) {
              // Ignore
            }
          }
        } else {
          // Fallback if reader stream is unsupported
          const data = await res.json();
          textResponse = data.message?.content || "{}";
          if (data.load_duration !== undefined) modelLoadTimeMs = data.load_duration / 1000000;
          if (data.prompt_eval_duration !== undefined) promptEvalTimeMs = data.prompt_eval_duration / 1000000;
          if (data.eval_duration !== undefined) generationTimeMs = data.eval_duration / 1000000;
          if (data.eval_count !== undefined) tokenCount = data.eval_count;
        }

        const duration = Date.now() - startTimer;
        const attemptDuration = Date.now() - attemptStart;
        const measuredFirstTokenLatency = firstTokenTime > 0 ? (firstTokenTime - attemptStart) : attemptDuration;
        const measuredGenerationTime = firstTokenTime > 0 ? (Date.now() - firstTokenTime) : 0;

        console.log(`[Ollama Inference Success for '${currentModel}']:`);
        console.log(`- Model Load Time: ${modelLoadTimeMs.toFixed(2)}ms (reported by Ollama)`);
        console.log(`- Prompt Eval Time: ${promptEvalTimeMs.toFixed(2)}ms (reported by Ollama)`);
        console.log(`- First-Token Latency: ${measuredFirstTokenLatency}ms (measured from request start)`);
        console.log(`- Generation Time: ${generationTimeMs > 0 ? generationTimeMs.toFixed(2) + "ms" : measuredGenerationTime + "ms"}`);
        console.log(`- Total Request Duration: ${attemptDuration}ms`);
        console.log(`- Total App Routing Latency: ${duration}ms`);
        
        const finalTokens = tokenCount > 0 ? tokenCount : Math.max(1, Math.round(textResponse.length / 4));
        const speedTps = duration > 0 ? (finalTokens / (duration / 1000)) : 0;
        
        // Save metric
        saveModelMetric({
          modelName: currentModel,
          latencyMs: duration,
          tokens: finalTokens,
          speedTps,
          success: true,
          memorySizeGB
        });

        let finalReason = `Ollama execution successful with model '${currentModel}'.`;
        if (currentModel !== preferredModelName) {
          finalReason = `Primary local model '${preferredModelName}' failed/timed out. Automatically fell back to installed model '${currentModel}'.`;
        }
        
        return {
          success: true,
          modelName: currentModel,
          textResponse,
          reason: finalReason,
          latency: duration
        };
      } else {
        const errorText = await res.text().catch(() => "Unknown error");
        console.warn(`- Request failed with status ${res.status}: ${errorText}`);
        
        // Save failed metric
        const duration = Date.now() - startTimer;
        saveModelMetric({
          modelName: currentModel,
          latencyMs: duration,
          tokens: 0,
          speedTps: 0,
          success: false,
          memorySizeGB
        });
      }
    } catch (err: any) {
      const fullErrorMsg = err?.stack || err?.message || String(err);
      console.error(`- Error during Ollama request:`, fullErrorMsg);
      
      // Save failed metric
      const modelObj = allModels.find(m => m.name === currentModel || m.model === currentModel);
      const memorySizeGB = modelObj ? (modelObj.size / (1024 ** 3)) : 0;
      const duration = Date.now() - startTimer;
      saveModelMetric({
        modelName: currentModel,
        latencyMs: duration,
        tokens: 0,
        speedTps: 0,
        success: false,
        memorySizeGB
      });
    }
  }

  // If all models in the sequence failed
  const totalDuration = Date.now() - startTimer;
  return {
    success: false,
    modelName: preferredModelName,
    textResponse: "",
    reason: `All attempted local Ollama models (${attemptSequence.join(", ")}) failed or timed out.`,
    latency: totalDuration
  };
}

export async function routeRequest(message: string, history: any[], systemPrompt: string, clientLanguage?: string, overrideProvider?: string) {
  const msgLower = message.toLowerCase();
  
  // 1. Task Classification for Capabilities
  let task = "general";
  if (msgLower.includes("code") || msgLower.includes("bug") || msgLower.includes("typescript") || msgLower.includes("javascript") || msgLower.includes("function") || msgLower.includes("program") || msgLower.includes("script") || msgLower.includes("compile") || msgLower.includes("error") || msgLower.includes("syntax") || msgLower.includes("rust") || msgLower.includes("python") || msgLower.includes("html") || msgLower.includes("css") || msgLower.includes("develop")) {
    task = "code";
  } else if (msgLower.includes("write") || msgLower.includes("essay") || msgLower.includes("poem") || msgLower.includes("story") || msgLower.includes("creative") || msgLower.includes("novel") || msgLower.includes("draft") || msgLower.includes("কবিতা") || msgLower.includes("গল্প") || msgLower.includes("রচনা")) {
    task = "creative";
  } else if (msgLower.includes("see") || msgLower.includes("look") || msgLower.includes("analyze") || msgLower.includes("image") || msgLower.includes("photo") || msgLower.includes("picture") || msgLower.includes("ছবি") || msgLower.includes("ভিজ্যুয়াল") || msgLower.includes("vision")) {
    task = "vision";
  }

  let provider = "gemini";
  let modelName = "gemini-3.1-flash-lite";
  let reason = "Default high-speed universal synthesis.";

  if (overrideProvider && overrideProvider !== "auto") {
    provider = overrideProvider;
    if (provider === "ollama") {
      const best = await getBestOllamaModel(task, message);
      modelName = best.modelName;
      reason = `User selected Ollama. ${best.reason}`;
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
        const best = await getBestOllamaModel(task, message);
        modelName = best.modelName;
        reason = `Auto-routed to local Ollama. ${best.reason}`;
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
    const ollamaStatus = await getOllamaStatus();
    if (ollamaStatus.online && ollamaStatus.models.length > 0) {
      provider = "ollama";
      const best = await getBestOllamaModel(task, message);
      modelName = best.modelName;
      reason = `Gemini key missing. Automatically routed to online local Ollama. ${best.reason}`;
    } else {
      const isBn = clientLanguage === "bengali";
      const apiMissingSpeak = isBn ? "এ পি আই কী কনফিগার করা নেই এবং ওলামা অফলাইন।" : "API keys missing and Ollama is offline.";
      return {
        text: `{ "response": "[Simulated] Cloud Gemini API key is missing and local Ollama is offline. Please configure GEMINI_API_KEY in Settings or launch Ollama.", "speakText": "${apiMissingSpeak}", "command": "none", "commandData": {} }`,
        routing: { selectedAI: "None (Offline)", reason: "Gemini API key missing & Ollama offline." }
      };
    }
  }

  let textResponse = "";
  const startTimer = Date.now();
  let latency = 0;

  try {
    if (provider === "ollama") {
      const result = await tryAllOllamaModels(systemPrompt, history, message, task, modelName, 120000);
      if (result.success) {
        textResponse = result.textResponse;
        modelName = result.modelName;
        reason = result.reason;
        latency = result.latency;
      } else {
        // Cloud Failsafe Fallback: Switch to Gemini if all local options failed
        if (gemini) {
          console.warn("All local Ollama models failed or timed out. Engaging Cloud Failsafe Fallback (Gemini)...");
          provider = "gemini";
          modelName = "gemini-3.1-flash-lite";
          reason = `${result.reason} (Engaged Cloud Failsafe to Gemini Core)`;
        } else {
          throw new Error(`Local Ollama connection failed and Cloud Gemini API key is missing. Detail: ${result.reason}`);
        }
      }
    }

    if (provider === "gemini") {
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
        const res = await withTimeout(
          gemini!.models.generateContent({
            model: modelName,
            ...generateOptions
          }),
          8000,
          "Gemini primary model request timed out"
        );
        textResponse = res.text || "{}";
      } catch (geminiErr: any) {
        const cleanPrimaryErr = cleanErrorMessage(geminiErr);
        console.warn(`[Gemini router failed with ${modelName}]: ${cleanPrimaryErr}. Trying fallback model...`);
        const fallbackModel = modelName === "gemini-3.1-flash-lite" ? "gemini-3.5-flash" : "gemini-3.1-flash-lite";
        try {
          const res = await withTimeout(
            gemini!.models.generateContent({
              model: fallbackModel,
              ...generateOptions
            }),
            5000,
            "Gemini fallback model request timed out"
          );
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
      
      const res = await withTimeout(
        openai!.chat.completions.create({
          model: modelName,
          messages: messages as any,
          response_format: { type: "json_object" }
        }),
        8000,
        "OpenAI API request timed out"
      );
      textResponse = res.choices[0].message.content || "{}";
      latency = Date.now() - startTimer;
      
    } else if (provider === "anthropic") {
       const messages = [
        ...history.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
        { role: "user", content: message }
      ];
      const res = await withTimeout(
        anthropic!.messages.create({
          model: modelName,
          system: systemPrompt,
          messages: messages as any,
          max_tokens: 1024,
        }),
        8000,
        "Anthropic API request timed out"
      );
      textResponse = (res.content[0] as any).text || "{}";
      latency = Date.now() - startTimer;
    }
  } catch (err: any) {
    const cleanErr = cleanErrorMessage(err);
    console.warn(`[Router Error with ${provider}]: ${cleanErr}. Checking local Ollama fallback...`);
    
    let ollamaFallbackSuccess = false;
    
    if (provider !== "ollama") {
      try {
        const best = await getBestOllamaModel(task, message);
        const fallbackModel = best.modelName;
        console.log(`[Cloud Failed]: Attempting local Ollama fallback execution with preferred model '${fallbackModel}'...`);
        
        const result = await tryAllOllamaModels(systemPrompt, history, message, task, fallbackModel, 120000);
        if (result.success) {
          textResponse = result.textResponse;
          latency = result.latency;
          provider = "ollama";
          modelName = result.modelName;
          reason = `Cloud API failed (${cleanErr}). Successfully fell back to local Ollama model '${result.modelName}'. ${result.reason}`;
          ollamaFallbackSuccess = true;
        }
      } catch (ollamaErr: any) {
        console.warn("[Ollama Fallback Failed]:", ollamaErr);
      }
    }
    
    if (!ollamaFallbackSuccess) {
      console.warn(`Routing to Local Cognitive Fallback Engine.`);
      textResponse = generateRuviFallbackResponse(message, history || [], clientLanguage);
      provider = "Ruvi Local Engine";
      modelName = "Cognitive-v1-Sim";
      reason = `Simulated Core Fallback active. (Primary Error: ${cleanErr})`;
    }
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
