export class EventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Array<T[K]> } = {};

  on<K extends keyof T>(event: K, listener: T[K]) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter(l => l !== listener) as any;
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>) {
    if (!this.listeners[event]) return;
    this.listeners[event]!.forEach(listener => (listener as any)(...args));
  }
}
