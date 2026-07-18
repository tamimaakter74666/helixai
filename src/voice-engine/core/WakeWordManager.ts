
import { EventEmitter } from "../utils/EventEmitter";

export interface WakeWordEvents {
  wakeWordDetected: () => void;
}

export class WakeWordManager extends EventEmitter<WakeWordEvents> {
  processTranscript(text: string) {
    const lower = text.toLowerCase();
    
    // English variations
    const hasEnglishWake = 
      lower.includes("ruvi") || 
      lower.includes("ruby") || 
      lower.includes("rubi") ||
      lower.includes("roovy") ||
      lower.includes("hey") ||
      lower.includes("hello") ||
      lower.includes("hi");
    
    // Bengali script variations for Ruvi / Ruby / Hey Ruvi / Robi / hello / hi
    const hasBengaliWake = 
      lower.includes("রুভি") || 
      lower.includes("রুবি") || 
      lower.includes("রুভী") || 
      
      
      lower.includes("রূভী") ||
      lower.includes("হেই রুভি") ||
      lower.includes("হে রুভি") ||
      lower.includes("হ্যালো") ||
      lower.includes("হাই") ||
      lower.includes("হে") ||
      lower.includes("হেই");

    if (hasEnglishWake || hasBengaliWake) {
      this.emit("wakeWordDetected");
    }
  }
}
