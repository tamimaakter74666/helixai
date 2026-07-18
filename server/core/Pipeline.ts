import { memoryManager } from "./MemoryManager";
import { registry } from "./Registry";
import { detectEnvironment } from "./Environment";
import { routeRequest } from "../router"; // We will adapt this or use it internally

export interface PipelineRequest {
  message: string;
  history: any[];
  language?: string;
  provider?: string;
  modelName?: string;
}

export interface ExecutionReport {
  plan: string;
  evidence: string[];
  commands: any[];
  toolUsage: any[];
  modifiedFiles: string[];
  verificationResults: string;
  confidenceScore: number;
  rootCauseAnalysis?: string;
  lessonsLearned?: string;
  memoryUpdates?: any[];
}

export interface PipelineResponse {
  response: string;
  speakText: string;
  detectedEmotion: string;
  report: ExecutionReport;
}

export class CognitivePipeline {
  async process(req: PipelineRequest): Promise<PipelineResponse> {
    const env = detectEnvironment();
    
    // Step 1 & 2: Understand & Retrieve Context
    const ltMemory = await memoryManager.getLongTermContext();
    
    // Construct Unified System Prompt
    const systemPrompt = `You are "Ruvi", a Unified Autonomous Cognitive AI Operating System.
Environment: ${env.environment} (${env.osType})
${ltMemory}

You must process the user request using the following Cognitive Pipeline:
Understand -> Plan -> Risk Analysis -> Select Tools -> Execute -> Verify -> Learn.

You have access to the following capabilities:
${registry.getAllTools().map(t => `- ${t.name}: ${t.description}`).join("\n")}

Respond strictly in valid JSON format matching this schema:
{
  "response": "Markdown response for the chat UI",
  "speakText": "Text for TTS engine",
  "detectedEmotion": "calm/joy/sorrow/anger/surprise",
  "plan": "Step-by-step execution plan",
  "commandsToExecute": [{ "command": "tool_name", "data": {} }],
  "confidenceScore": 95
}
`;

    // Step 3 & 4: Plan & Select Tools
    // For now, we rely on the existing router to call the model
    // In full implementation, we will explicitly manage the execution loop here.
    
    // Dummy response for testing the structure
    return {
      response: "Processing in unified core...",
      speakText: "Processing in unified core.",
      detectedEmotion: "calm",
      report: {
        plan: "1. Analyze. 2. Execute.",
        evidence: [],
        commands: [],
        toolUsage: [],
        modifiedFiles: [],
        verificationResults: "Pending",
        confidenceScore: 100
      }
    };
  }
}

export const pipeline = new CognitivePipeline();
