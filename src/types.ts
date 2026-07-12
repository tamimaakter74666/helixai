export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  speakText?: string;
  command?: string;
  commandData?: any;
  routingInfo?: {
    selectedAI: string;
    reason: string;
    latency?: number;
  };
  timestamp: Date;
}

export interface MemoryLog {
  id: string;
  key: string;
  value: string;
  timestamp: Date;
}

export interface PlannerTask {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed";
  assignedAI: string;
}

export interface WhatsAppMessage {
  id: string;
  contact: string;
  message: string;
  status: "pending_auth" | "sending" | "delivered" | "read";
  timestamp: Date;
}
