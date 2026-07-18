export class EventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Array<any> } = {};

  on<K extends keyof T>(event: K, listener: T[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter(l => l !== listener);
  }

  emit<K extends keyof T>(event: K, ...args: T[K] extends (...args: infer P) => any ? P : any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event]!.forEach(listener => {
      if (typeof listener === "function") {
        listener(...args);
      }
    });
  }
}
