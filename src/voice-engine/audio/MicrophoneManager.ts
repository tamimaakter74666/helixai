import { EventEmitter } from "../utils/EventEmitter";
import { LoggingManager } from "../utils/LoggingManager";

export interface MicrophoneEvents {
  streamReady: (stream: MediaStream) => void;
  streamEnded: () => void;
  error: (err: Error) => void;
}

export class MicrophoneManager extends EventEmitter<MicrophoneEvents> {
  private activeStream: MediaStream | null = null;
  
  async start(): Promise<MediaStream | null> {
    if (this.activeStream) {
      return this.activeStream;
    }

    try {
      this.activeStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      LoggingManager.info("MicrophoneManager", "Microphone stream started.");
      this.emit("streamReady", this.activeStream);
      
      this.activeStream.getTracks().forEach(track => {
        track.onended = () => {
          LoggingManager.warn("MicrophoneManager", "Microphone track ended unexpectedly.");
          this.stop();
        };
      });

      return this.activeStream;
    } catch (e: any) {
      LoggingManager.error("MicrophoneManager", "Failed to get microphone stream.", e);
      this.emit("error", e);
      return null;
    }
  }

  stop() {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(track => track.stop());
      this.activeStream = null;
      LoggingManager.info("MicrophoneManager", "Microphone stream stopped.");
      this.emit("streamEnded");
    }
  }

  getStream(): MediaStream | null {
    return this.activeStream;
  }
}
