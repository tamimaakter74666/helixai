const fs = require('fs');
const file = 'src/voice-engine/core/SpeechRecognizer.ts';

const code = `
import { EventEmitter } from "../utils/EventEmitter";

export interface SpeechRecognizerEvents {
  transcript: (text: string, isFinal: boolean) => void;
  modelSpoke: (text: string) => void;
  error: (err: any) => void;
  end: () => void;
}

export class SpeechRecognizer extends EventEmitter<SpeechRecognizerEvents> {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    super();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "bn-BD"; // Or en-US depending on state

      this.recognition.onresult = (event: any) => {
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
          this.emit("transcript", finalTranscript, true);
        } else if (interimTranscript) {
          this.emit("transcript", interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.emit("error", event.error);
      };

      this.recognition.onend = () => {
        this.emit("end");
        if (this.isListening) {
           try { this.recognition.start(); } catch (e) {}
        }
      };
    }
  }

  start() {
    this.isListening = true;
    if (this.recognition) {
      try { this.recognition.start(); } catch (e) {}
    }
  }

  stop() {
    this.isListening = false;
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

  processLiveMessage(msg: any) {
    // Only process model responses here, let native recognition handle user transcripts for realtime UI
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
         if (part.text) {
             this.emit("modelSpoke", part.text);
         }
      }
    }
  }
}
`;

fs.writeFileSync(file, code);
