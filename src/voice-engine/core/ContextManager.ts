
export class ContextManager {
  private history: { role: string, text: string }[] = [];
  
  add(role: string, text: string) {
    this.history.push({ role, text });
  }

  get() {
    return this.history;
  }
}
