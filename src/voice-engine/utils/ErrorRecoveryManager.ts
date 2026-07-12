import { LoggingManager } from "./LoggingManager";

export class ErrorRecoveryManager {
  private retryCounts: Record<string, number> = {};
  private maxRetries = 3;

  async executeWithRecovery<T>(
    module: string, 
    operationName: string, 
    operation: () => Promise<T>, 
    fallback?: () => Promise<T>
  ): Promise<T> {
    const key = `${module}:${operationName}`;
    this.retryCounts[key] = 0;

    while (this.retryCounts[key] < this.maxRetries) {
      try {
        const result = await operation();
        this.retryCounts[key] = 0; // reset on success
        return result;
      } catch (error) {
        this.retryCounts[key]++;
        LoggingManager.warn(module, `Operation ${operationName} failed. Attempt ${this.retryCounts[key]} of ${this.maxRetries}`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCounts[key])); // Exponential backoff
      }
    }
    
    LoggingManager.error(module, `Operation ${operationName} exhausted all retries.`);
    if (fallback) {
      LoggingManager.info(module, `Executing fallback for ${operationName}`);
      return fallback();
    }
    throw new Error(`${module}: ${operationName} failed after ${this.maxRetries} retries.`);
  }

  reset(module: string, operationName: string) {
    this.retryCounts[`${module}:${operationName}`] = 0;
  }
}
