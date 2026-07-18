export class LoggingManager {
  private static async logToBackend(level: "info" | "warning" | "error" | "success", category: string, message: string, details?: string) {
    try {
      if (typeof window !== "undefined" && window.fetch) {
        window.fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, category, message, details }),
        }).catch(() => {});
      }
    } catch (e) {
      // Ignore network errors
    }
  }

  static debug(module: string, message: string, ...args: unknown[]) {
    console.debug(`[${module}] ${message}`, ...args);
  }

  static info(module: string, message: string, ...args: unknown[]) {
    console.info(`[${module}] ${message}`, ...args);
    const detailsStr = args.length ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" | ") : undefined;
    this.logToBackend("info", "speech", `[${module}] ${message}`, detailsStr);
  }

  static warn(module: string, message: string, ...args: unknown[]) {
    console.warn(`[${module}] ${message}`, ...args);
    const detailsStr = args.length ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" | ") : undefined;
    this.logToBackend("warning", "speech", `[${module}] ${message}`, detailsStr);
  }

  static error(module: string, message: string, ...args: unknown[]) {
    console.error(`[${module}] ${message}`, ...args);
    const detailsStr = args.length ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" | ") : undefined;
    this.logToBackend("error", "speech", `[${module}] ${message}`, detailsStr);
  }

  static success(module: string, message: string, ...args: unknown[]) {
    console.log(`[${module}] SUCCESS: ${message}`, ...args);
    const detailsStr = args.length ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" | ") : undefined;
    this.logToBackend("success", "speech", `[${module}] ${message}`, detailsStr);
  }
}

