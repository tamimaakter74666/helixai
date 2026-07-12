
import { EventEmitter } from "../utils/EventEmitter";

export interface SpeechRecognizerEvents {
  transcript: (text: string, isFinal: boolean) => void;
  modelSpoke: (text: string) => void;
  error: (err: any) => void;
  end: () => void;
  start: () => void;
}

export class SpeechRecognizer extends EventEmitter<SpeechRecognizerEvents> {
  private recognition: any = null;
  private isListening = false;
  private errorCount = 0;
  private lastErrorTime = 0;
  private restartTimeoutId: any = null;

  constructor() {
    super();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "bn-BD"; // Or en-US depending on state

      this.recognition.onstart = () => {
        console.log("[SpeechRecognizer] Web Speech API started listening successfully.");
        this.errorCount = 0; // Reset error count on successful startup
        this.emit("start");
      };

      this.recognition.onresult = (event: any) => {
        console.log("Speech recognition onresult", event);
        this.errorCount = 0; // Reset error state on any successful speech fragment!
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          this.lastFinalTranscriptTime = Date.now();
          this.lastTranscriptString = finalTranscript;
          this.emit("transcript", finalTranscript, true);
        } else if (interimTranscript) {
          this.emit("transcript", interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: any) => {
        const now = Date.now();
        const errStr = String(event.error || "").toLowerCase();
        
        // "no-speech" is not a real failure, it is just silence. Do not increment error backoffs.
        if (errStr !== "no-speech" && errStr !== "aborted") {
          if (now - this.lastErrorTime < 5000) {
            this.errorCount++;
          } else {
            this.errorCount = 1;
          }
          this.lastErrorTime = now;
        }

        console.warn(`[SpeechRecognizer] onerror event: ${event.error} (Conseq. count: ${this.errorCount})`);
        
        // Stop retrying immediately for fatal/unrecoverable errors
        const fatalErrors = ["not-allowed", "service-not-allowed", "language-not-supported"];
        if (fatalErrors.includes(errStr)) {
          console.warn(`[SpeechRecognizer] Fatal speech error: ${event.error}. Disabling automatic listening.`);
          this.isListening = false;
          if (this.restartTimeoutId) {
            clearTimeout(this.restartTimeoutId);
            this.restartTimeoutId = null;
          }
        }

        // Do not emit errors for normal aborts or silence, as they are part of regular operations
        if (errStr !== "no-speech" && errStr !== "aborted") {
          this.emit("error", event.error);
        }
      };

      this.recognition.onend = () => {
        this.emit("end");
        if (this.isListening) {
          // If we had real errors (like network/audio issues), calculate backoff (up to 10s) to avoid hammer-restarting
          // If silence (no-speech) or normal completion, restart immediately (100ms) for maximum responsiveness!
          const backoffDelay = this.errorCount > 0 ? Math.min(10000, 500 * Math.pow(2, this.errorCount - 1)) : 100;
          console.log(`[SpeechRecognizer] onend triggered. Scheduling restart in ${backoffDelay}ms.`);
          
          if (this.restartTimeoutId) clearTimeout(this.restartTimeoutId);
          this.restartTimeoutId = setTimeout(() => {
            if (this.isListening) {
               try { this.recognition.start(); } catch (e) {}
            }
          }, backoffDelay);
        }
      };
    }
  }

  start() {
    this.isListening = true;
    this.errorCount = 0; // Reset consecutive error tally when user starts recording
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
    if (this.recognition) {
      try { this.recognition.start(); } catch (e) {}
    }
  }

  stop() {
    this.isListening = false;
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
  }

  setLanguage(lang: string) {
    if (this.recognition) {
       this.recognition.lang = lang;
       if (this.isListening) {
          this.stop();
          setTimeout(() => this.start(), 100);
       }
    }
  }

  private lastFinalTranscriptTime = 0;
  private lastTranscriptString = "";

  processLiveMessage(msg: any) {
    // 1. Process User Transcripts from Gemini Live API
    if (msg.serverContent?.inputTranscription) {
      const tx = msg.serverContent.inputTranscription;
      if (tx.text) {
         console.log("Gemini Live API Final User Transcript:", tx.text);
         // Deduplicate against local SpeechRecognition
         if (Date.now() - this.lastFinalTranscriptTime > 2000 || this.lastTranscriptString !== tx.text) {
             this.emit("transcript", tx.text, true);
             this.lastFinalTranscriptTime = Date.now();
             this.lastTranscriptString = tx.text;
         }
      }
    }
    if (msg.serverContent?.interimInputTranscription) {
      const tx = msg.serverContent.interimInputTranscription;
      if (tx.text) {
         console.log("Gemini Live API Interim User Transcript:", tx.text);
         this.emit("transcript", tx.text, false);
      }
    }

    // 2. Process Client turns if sent by server
    if (msg.clientContent?.turns) {
       for (const turn of msg.clientContent.turns) {
          if (turn.parts) {
             for (const part of turn.parts) {
                if (part.text) {
                   this.emit("transcript", part.text, true);
                }
             }
          }
       }
    }
    
    // 3. Process Model responses (what Ruvi says)
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
         if (part.text) {
             console.log("Gemini Live API Model Spoke:", part.text);
             this.emit("modelSpoke", part.text);
         }
      }
    }
  }
}
