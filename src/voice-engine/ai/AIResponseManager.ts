import { EventEmitter } from "../utils/EventEmitter";
import { ConversationMemory } from "./ConversationMemory";
import { LoggingManager } from "../utils/LoggingManager";

export interface AIResponseEvents {
  responseStart: () => void;
  responseChunk: (text: string) => void;
  responseEnd: (fullText: string) => void;
  error: (err: unknown) => void;
}

export class AIResponseManager extends EventEmitter<AIResponseEvents> {
  private memory = new ConversationMemory();

  async generateResponse(userInput: string, onExternalProcess?: (text: string) => void) {
    this.memory.addMessage('user', userInput);
    this.emit('responseStart');

    try {
      if (onExternalProcess) {
         onExternalProcess(userInput);
      }
    } catch (e) {
      LoggingManager.error("AIResponseManager", "Failed to generate response", e);
      this.emit('error', e);
    }
  }
  
  provideResponse(text: string) {
      this.memory.addMessage('assistant', text);
      this.emit('responseEnd', text);
  }
}
