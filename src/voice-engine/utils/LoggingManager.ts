export class LoggingManager {
  static debug(module: string, message: string, ...args: any[]) {
    console.debug(`[${module}] ${message}`, ...args);
  }
  static info(module: string, message: string, ...args: any[]) {
    console.info(`[${module}] ${message}`, ...args);
  }
  static warn(module: string, message: string, ...args: any[]) {
    console.warn(`[${module}] ${message}`, ...args);
  }
  static error(module: string, message: string, ...args: any[]) {
    console.error(`[${module}] ${message}`, ...args);
  }
}
