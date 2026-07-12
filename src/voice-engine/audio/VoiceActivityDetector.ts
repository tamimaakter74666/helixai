import { EventEmitter } from "../utils/EventEmitter";
import { LoggingManager } from "../utils/LoggingManager";

export interface VADEvents {
  speechStart: () => void;
  speechEnd: () => void;
  volumeChange: (level: number) => void;
}

export class VoiceActivityDetector extends EventEmitter<VADEvents> {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  
  private isSpeaking = false;
  private animationFrameId = 0;
  private threshold = 15;
  private silenceDurationMs = 1500;
  private silenceTimer: any = null;

  start(stream: MediaStream) {
    this.stop();

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      LoggingManager.info("VAD", "VAD started successfully.");
      this.detect();
    } catch (e) {
      LoggingManager.error("VAD", "Failed to start VAD", e);
    }
  }

  private detect() {
    if (!this.analyser) return;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    this.emit('volumeChange', average);

    if (average > this.threshold) {
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        LoggingManager.info("VAD", "Speech started");
        this.emit('speechStart');
      }
      
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if (this.isSpeaking) {
          this.isSpeaking = false;
          LoggingManager.info("VAD", "Speech ended (silence detected)");
          this.emit('speechEnd');
        }
      }, this.silenceDurationMs);
    }

    this.animationFrameId = requestAnimationFrame(() => this.detect());
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    
    clearTimeout(this.silenceTimer);
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    
    this.isSpeaking = false;
    LoggingManager.info("VAD", "VAD stopped.");
  }
}
