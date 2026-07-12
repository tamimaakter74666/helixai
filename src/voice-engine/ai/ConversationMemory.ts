export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class ConversationMemory {
  private history: Message[] = [];

  addMessage(role: 'user' | 'assistant', content: string) {
    this.history.push({ role, content, timestamp: new Date() });
  }

  getHistory(limit: number = 10): Message[] {
    return this.history.slice(-limit);
  }

  clear() {
    this.history = [];
  }
}
