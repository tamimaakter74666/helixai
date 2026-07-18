import { GoogleGenAI } from "@google/genai";
import { registry } from "./Registry";
import { detectEnvironment } from "./Environment";
import { memoryManager } from "./MemoryManager";
import { saveSystemLog, saveRequestTrace, RequestTrace, RequestTraceIteration } from "../db";
import { routeRequest, detectIsBengaliOrBanglish } from "../router";

let ai: GoogleGenAI | null = null;
export function initCoreAI(apiKey?: string) {
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
}

function robustParseJSON(text: string): any {
  if (!text || typeof text !== "string") {
    return {
      thoughtProcess: "Fallback: Empty or non-string response.",
      backendToolsToExecute: [],
      clientCommands: [],
      response: "Empty response from AI.",
      speakText: "Empty response from AI.",
      detectedEmotion: "calm",
      isFinal: true
    };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      thoughtProcess: "Fallback: Empty trimmed response.",
      backendToolsToExecute: [],
      clientCommands: [],
      response: "Empty response from AI.",
      speakText: "Empty response from AI.",
      detectedEmotion: "calm",
      isFinal: true
    };
  }

  const ensureFields = (obj: any) => {
    if (typeof obj !== "object" || obj === null) {
      return null;
    }
    // Ensure essential fields exist, or initialize them
    obj.thoughtProcess = obj.thoughtProcess || "Processed response.";
    obj.backendToolsToExecute = obj.backendToolsToExecute || [];
    obj.clientCommands = obj.clientCommands || [];
    obj.response = obj.response || "";
    obj.speakText = obj.speakText || obj.response || "";
    obj.detectedEmotion = obj.detectedEmotion || "calm";
    if (obj.isFinal === undefined) {
      obj.isFinal = true;
    }
    return obj;
  };

  // 1. Direct parse attempt
  try {
    const directParsed = JSON.parse(trimmed);
    if (typeof directParsed === "object" && directParsed !== null) {
      return ensureFields(directParsed);
    }
  } catch (e) {
    // Continue
  }

  // 2. Try cleaning markdown block (e.g., ```json ... ```)
  try {
    const cleaned = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .trim();
    const markdownParsed = JSON.parse(cleaned);
    if (typeof markdownParsed === "object" && markdownParsed !== null) {
      return ensureFields(markdownParsed);
    }
  } catch (e) {
    // Continue
  }

  // 3. Try to locate the first '{' and the last '}'
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const extracted = trimmed.substring(firstBrace, lastBrace + 1);
      const extractedParsed = JSON.parse(extracted);
      if (typeof extractedParsed === "object" && extractedParsed !== null) {
        return ensureFields(extractedParsed);
      }
    } catch (e) {
      // Continue
    }
  }

  // 4. Raw text fallback:
  // If no JSON can be parsed, treat the entire text as a conversation response!
  return {
    thoughtProcess: "Fallback: AI model did not return a valid JSON object. Parsed raw response instead.",
    backendToolsToExecute: [],
    clientCommands: [],
    response: trimmed,
    speakText: trimmed,
    detectedEmotion: "calm",
    isFinal: true
  };
}

export async function runCognitiveLoop(
  message: string,
  history: any[],
  provider: string,
  overrideModel?: string,
  traceId?: string,
  inputType: "chat" | "voice" = "chat"
) {
  if (!ai && provider === "gemini") {
    throw new Error("Gemini AI not initialized for Cognitive Core");
  }

  const env = detectEnvironment();
  const ltMemory = await memoryManager.getLongTermContext();

  const systemInstruction = `You are "Ruvi", a Unified Autonomous Cognitive AI Operating System.
Environment: ${env.environment} (${env.osType}, ${env.platform})
Hostname: ${env.hostname}

${ltMemory}

COGNITIVE PIPELINE:
For every user request, follow: Understand -> Plan -> Select Tools -> Execute Backend Tools -> Verify -> Respond.

Backend Tools (executed immediately by you in the backend):
${registry.getAllTools().map(t => `- ${t.name}: ${t.description}`).join("\n")}

Client Commands (sent to the UI to execute):
- remove_background, sunset_sky, upscale_4k, send_whatsapp, lock_pc, open_app, terminal_execute

SELF-LEARNING PROTOCOL (Identify -> Research -> Learn -> Checkpoint -> Install -> Verify -> Register -> Remember -> Use -> Improve):
If the user requests a task you currently cannot perform (not in the Registry), follow the Self-Learning Protocol:
1. Identify & Plan: Analyze required skills, libraries, and AI models to fulfill the user's request.
2. Ask Permission (CRITICAL): Inform the user about the plan, required dependencies, and risks. YOU MUST ASK FOR EXPLICIT PERMISSION before making any big changes (boro poriborton), software installation, package download, registry modification, sensitive file access, or OS-level action. DO NOT proceed until the user clearly says yes.
3. Create Checkpoint: Use 'create_checkpoint' tool BEFORE starting the installation or making any risky changes. This allows full restore if things go wrong.
4. Install Dependencies: If approved and checkpointed, use 'terminal_execute' (Backend Tool) to install required npm packages.
5. Register Capability: Use 'register_capability' to write the JavaScript execution logic for the new tool. The scriptBody is an async function body with access to 'context' (containing context.args), 'customRequire', and 'console'. Each capability is versioned and supports rollback.
6. Verify & Remember: Once registered, it is permanently added to your Registry and Learning Database. Do not claim you can do it until it's verified.

RECOVERY & RESTORE PROTOCOL:
If a task fails, causes an error, or the user requests to restore a previous state, use the 'list_checkpoints' and 'restore_checkpoint' tools to revert the system.

CRITICAL: The 'command' field in backendToolsToExecute MUST exactly match one of the Backend Tools names listed above. For example, use 'desktop_execute' with action 'volume_set', DO NOT use 'volume_set' directly as the tool name.

LANGUAGE COMPREHENSION & BILINGUAL RESPONSE PROTOCOL:
- You are a highly intelligent bilingual AI. You can understand English, standard Bengali (বাংলা), and Banglish (Bengali words written in English/Latin letters, e.g., 'bujhe na', 'kaj kore na', 'baje').
- ALWAYS detect the user's input language. If they speak or write in Bengali or Banglish, you MUST formulate your final "response" and "speakText" in beautiful, natural, grammatically correct Bengali (using Bengali script).
- Keep your Bengali responses extremely polished, futuristic, smart, friendly, and matching the user's emotional undertone. Never translate literally.

JSON SCHEMA:
{
  "thoughtProcess": "Brief reasoning",
  "backendToolsToExecute": [ { "command": "tool_name", "data": {} } ],
  "clientCommands": [ { "command": "client_cmd", "data": {} } ],
  "response": "Markdown response for the user (only populate when isFinal is true)",
  "speakText": "Text for TTS (only populate when isFinal is true)",
  "detectedEmotion": "calm/joy/sorrow/anger/surprise",
  "isFinal": boolean // Set true ONLY when you are done. If you are executing a Backend Tool, set this to FALSE so you can read the tool's result in the next iteration before responding.
}
`;

  const startTime = Date.now();
  const actualTraceId = traceId || `tr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const trace: RequestTrace = {
    id: actualTraceId,
    timestamp: new Date().toISOString(),
    inputType,
    inputMessage: message,
    detectedLanguage: detectIsBengaliOrBanglish(message) ? "bengali" : "english",
    systemInstructionUsed: systemInstruction,
    iterations: [],
    isCompleted: false
  };
  saveRequestTrace(trace);

  let conversation = [
    { role: "system", content: systemInstruction },
    ...history.map(h => ({ role: h.role === "model" || h.role === "assistant" ? "model" : "user", content: h.content || "" })),
    { role: "user", content: message }
  ];

  let loopCount = 0;
  const maxLoops = 5;
  let finalJson: any = null;
  let executionLog: any[] = [];
  let accumulatedClientCommands: any[] = [];
  let lastRoutingInfo: any = null;

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`[Cognitive Loop] Iteration ${loopCount}`);
    
    let text = "";
    const promptToModel = conversation[conversation.length - 1].content;
    try {
      const historyForModel = conversation.slice(1, -1).map(c => ({
        role: c.role === "model" ? "assistant" : c.role,
        content: c.content
      }));

      const isBnOrBanglish = detectIsBengaliOrBanglish(message);
      const clientLanguage = isBnOrBanglish ? "bengali" : undefined;

      const routeResult = await routeRequest(
        promptToModel,
        historyForModel,
        systemInstruction,
        clientLanguage,
        provider,
        overrideModel
      );

      text = routeResult.text;
      lastRoutingInfo = routeResult.routing;
    } catch (apiError: any) {
      console.error("[Cognitive Loop] Provider Manager Request failed:", apiError.message);
      
      const errorIteration: RequestTraceIteration = {
        loopIndex: loopCount,
        timestamp: new Date().toISOString(),
        promptSent: promptToModel,
        rawAIResponse: `Provider Request Failed: ${apiError.message}`,
        parsedThought: "Error in Routing or LLM execution"
      };
      trace.iterations.push(errorIteration);
      trace.isCompleted = true;
      trace.totalLatencyMs = Date.now() - startTime;
      trace.finalResponse = `Cognitive Core Error: ${apiError.message}`;
      saveRequestTrace(trace);

      return {
         response: `Cognitive Core Error: ${apiError.message}`,
         speakText: "I encountered an error.",
         detectedEmotion: "sorrow",
         isFinal: true,
         clientCommands: accumulatedClientCommands,
         command: "none",
         commandData: {},
         executionLog,
         traceId: actualTraceId
      };
    }

    let parsed = robustParseJSON(text);

    executionLog.push({ step: loopCount, thought: parsed.thoughtProcess, backend: parsed.backendToolsToExecute, client: parsed.clientCommands });

    if (parsed.clientCommands && parsed.clientCommands.length > 0) {
      accumulatedClientCommands.push(...parsed.clientCommands);
    }

    // Execute Backend Tools
    const toolResults: { command: string; status: "success" | "error"; result?: any; error?: string }[] = [];
    if (parsed.backendToolsToExecute && parsed.backendToolsToExecute.length > 0) {
      for (const cmd of parsed.backendToolsToExecute) {
        const tool = registry.getTool(cmd.command);
        if (tool) {
          try {
            const result = await tool.execute({ args: cmd.data, environment: env.environment });
            toolResults.push({ command: cmd.command, status: "success", result });
          } catch (err: any) {
            toolResults.push({ command: cmd.command, status: "error", error: err.message });
          }
        } else {
          toolResults.push({ command: cmd.command, status: "error", error: "Tool not found" });
        }
      }
    }

    // Record iteration info
    const iterationInfo: RequestTraceIteration = {
      loopIndex: loopCount,
      timestamp: new Date().toISOString(),
      promptSent: promptToModel,
      modelSelected: lastRoutingInfo?.modelName,
      providerSelected: lastRoutingInfo?.selectedAI || lastRoutingInfo?.provider,
      routingReason: lastRoutingInfo?.reason,
      rawAIResponse: text,
      parsedThought: parsed.thoughtProcess,
      backendToolsCalled: parsed.backendToolsToExecute,
      clientCommandsCalled: parsed.clientCommands,
      toolResults: toolResults
    };
    trace.iterations.push(iterationInfo);
    saveRequestTrace(trace);

    if (parsed.isFinal || !parsed.backendToolsToExecute || parsed.backendToolsToExecute.length === 0) {
      finalJson = parsed;
      // Attach the last tool results just in case
      finalJson.lastToolResults = toolResults;
      break;
    }

    // Prepare for next iteration
    conversation.push({ role: "model", content: JSON.stringify(parsed) });
    conversation.push({ role: "user", content: `Tool Results:\n${JSON.stringify(toolResults)}\nAnalyze results. If success, verify and provide final response with isFinal=true.` });
  }

  if (!finalJson) {
     finalJson = { response: "Task timed out.", speakText: "Task timed out.", detectedEmotion: "calm" };
  }

  finalJson.clientCommands = accumulatedClientCommands;
  finalJson.executionLog = executionLog;
  finalJson.routingInfo = lastRoutingInfo || { selectedAI: provider, latency: 0, reason: "Unified Cognitive Core" };
  
  // Backwards compatibility with frontend expectation
  finalJson.command = accumulatedClientCommands.length > 0 ? accumulatedClientCommands[0].command : "none";
  finalJson.commandData = accumulatedClientCommands.length > 0 ? accumulatedClientCommands[0].data : {};

  // Finalize trace
  trace.finalResponse = finalJson.response;
  trace.finalSpeakText = finalJson.speakText;
  trace.detectedEmotion = finalJson.detectedEmotion;
  trace.isCompleted = true;
  trace.totalLatencyMs = Date.now() - startTime;
  saveRequestTrace(trace);

  finalJson.traceId = actualTraceId;

  return finalJson;
}
