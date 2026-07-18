import { EventEmitter } from "../utils/EventEmitter";
import { OfflineTranscriber } from "./OfflineTranscriber";

export interface SpeechRecognizerEvents {
  transcript: (text: string, isFinal: boolean) => void;
  modelSpoke: (text: string) => void;
  error: (err: unknown) => void;
  end: () => void;
  start: () => void;
}

export class SpeechRecognizer extends EventEmitter<SpeechRecognizerEvents> {
  private recognition: any = null;
  private offlineTranscriber: OfflineTranscriber;
  private isListening = false;
  private errorCount = 0;
  private lastErrorTime = 0;
  private restartTimeoutId: any = null;
  private language = "bn-BD";

  constructor() {
    super();
    
    // Initialize Offline Transcriber
    this.offlineTranscriber = new OfflineTranscriber((text) => {
      this.emit("transcript", text, true);
    });

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;

      this.recognition.onstart = () => {
        console.log("[SpeechRecognizer] Web Speech API started listening successfully.");
        this.errorCount = 0;
        this.emit("start");
      };

      this.recognition.onresult = (event: any) => {
        this.errorCount = 0;
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
          if (/^\[.*\]$/.test(finalTranscript.trim()) || /^\(.*\)$/.test(finalTranscript.trim())) return;
          this.lastFinalTranscriptTime = Date.now();
          this.lastTranscriptString = finalTranscript;
          this.emit("transcript", finalTranscript, true);
        } else if (interimTranscript) {
          if (/^\[.*\]$/.test(interimTranscript.trim()) || /^\(.*\)$/.test(interimTranscript.trim())) return;
          this.emit("transcript", interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: any) => {
        const now = Date.now();
        const errStr = String(event.error || "").toLowerCase();
        
        if (errStr !== "no-speech" && errStr !== "aborted") {
          if (now - this.lastErrorTime < 5000) {
            this.errorCount++;
          } else {
            this.errorCount = 1;
          }
          this.lastErrorTime = now;
        }

        console.warn(`[SpeechRecognizer] onerror event: ${event.error} (Conseq. count: ${this.errorCount})`);
        
        if (errStr === "network" || !navigator.onLine) {
           console.log("[SpeechRecognizer] Network error detected. Switching to offline transcriber automatically...");
           this.recognition.stop();
           this.offlineTranscriber.start();
           return;
        }

        const fatalErrors = ["not-allowed", "service-not-allowed", "language-not-supported"];
        if (fatalErrors.includes(errStr)) {
          console.warn(`[SpeechRecognizer] Fatal speech error: ${event.error}. Disabling automatic listening.`);
          this.isListening = false;
          if (this.restartTimeoutId) {
            clearTimeout(this.restartTimeoutId);
            this.restartTimeoutId = null;
          }
        }

        if (errStr !== "no-speech" && errStr !== "aborted") {
          this.emit("error", event.error);
        }
      };

      this.recognition.onend = () => {
        this.emit("end");
        if (this.isListening && navigator.onLine) {
          const backoffDelay = this.errorCount > 0 ? Math.min(10000, 500 * Math.pow(2, this.errorCount - 1)) : 100;
          if (this.restartTimeoutId) clearTimeout(this.restartTimeoutId);
          this.restartTimeoutId = setTimeout(() => {
            if (this.isListening && navigator.onLine) {
               try { this.recognition.start(); } catch (_e) { /* empty */ }
            }
          }, backoffDelay);
        }
      };
    }

    // Auto-switch back to online when connection is restored
    window.addEventListener("online", () => {
      if (this.isListening) {
        console.log("[SpeechRecognizer] Internet connection restored. Switching back to Cloud Voice...");
        this.offlineTranscriber.stop();
        this.start();
      }
    });

    window.addEventListener("offline", () => {
      if (this.isListening) {
        console.log("[SpeechRecognizer] Internet connection lost. Switching to Local Whisper...");
        if (this.recognition) {
           try { this.recognition.stop(); } catch (_e) { /* empty */ }
        }
        this.offlineTranscriber.start();
      }
    });
  }

  start() {
    this.isListening = true;
    this.errorCount = 0;
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
    
    if (!navigator.onLine) {
       console.log("[SpeechRecognizer] Starting offline transcriber...");
       this.offlineTranscriber.start();
    } else if (this.recognition) {
      try { this.recognition.start(); } catch (_e) { /* empty */ }
    }
  }

  stop() {
    this.isListening = false;
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
      this.restartTimeoutId = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (_e) { /* empty */ }
    }
    this.offlineTranscriber.stop();
  }

  setLanguage(lang: string) {
    this.language = lang;
    this.offlineTranscriber.setLanguage(lang);
    if (this.recognition) {
       this.recognition.lang = lang;
       if (this.isListening && navigator.onLine) {
          this.stop();
          setTimeout(() => this.start(), 100);
       }
    }
  }

  private lastFinalTranscriptTime = 0;
  private lastTranscriptString = "";

  processLiveMessage(msg: any) {
    if (msg.serverContent?.inputTranscription) {
      const tx = msg.serverContent.inputTranscription;
      if (tx.text) {
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
         this.emit("transcript", tx.text, false);
      }
    }
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
         if (part.text) {
             this.emit("modelSpoke", part.text);
         }
      }
    }
  }
}
