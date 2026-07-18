import { getMemories, saveMemory, updateMemory, deleteMemory } from "../db";

export class MemoryManager {
  private sessionMemory: Map<string, any> = new Map();
  private workingMemory: Map<string, any> = new Map(); // Fast, ephemeral context

  async getLongTermContext(): Promise<string> {
    const memories = await getMemories(50) as any[];
    if (memories.length === 0) return "";
    return `\n\nLONG-TERM MEMORY (Use these to personalize responses):\n` + 
      memories.map(m => `- [${m.type}] ${m.content}`).join("\n");
  }

  async saveLongTerm(type: string, content: string, metadata: any = {}, importance: number = 1) {
    await saveMemory(type, content, metadata, importance);
  }

  setSession(key: string, value: any) {
    this.sessionMemory.set(key, value);
  }

  getSession(key: string) {
    return this.sessionMemory.get(key);
  }

  setWorking(key: string, value: any) {
    this.workingMemory.set(key, value);
  }

  getWorking(key: string) {
    return this.workingMemory.get(key);
  }
}

export const memoryManager = new MemoryManager();
