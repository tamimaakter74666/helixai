
import { ContextManager } from "./ContextManager";

export class ConversationManager {
  constructor(private contextManager: ContextManager) {}
  
  onUserSpoke(text: string) {
    this.contextManager.add("user", text);
  }
  
  onModelSpoke(text: string) {
    this.contextManager.add("model", text);
  }
}
