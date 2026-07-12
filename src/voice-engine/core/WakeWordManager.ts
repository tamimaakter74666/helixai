
import { EventEmitter } from "../utils/EventEmitter";

export interface WakeWordEvents {
  wakeWordDetected: () => void;
}

export class WakeWordManager extends EventEmitter<WakeWordEvents> {
  processTranscript(text: string) {
    const lower = text.toLowerCase();
    if (lower.includes("ruvi") || lower.includes("ruby") || lower.includes("roovy")) {
      this.emit("wakeWordDetected");
    }
  }
}
