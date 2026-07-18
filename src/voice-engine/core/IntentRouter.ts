
import { EventEmitter } from "../utils/EventEmitter";

export class IntentRouter extends EventEmitter<{ command: (cmd: string, data: unknown) => void }> {
  processTranscript(text: string) {
    const lower = text.toLowerCase();
    if (lower.includes("turn off lights") || lower.includes("toggle lights")) {
      this.emit("command", "toggle_lights", {});
    }
  }
}
