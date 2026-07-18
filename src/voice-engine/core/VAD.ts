import { EventEmitter } from "../utils/EventEmitter";

export interface VADEvents {
  speechStart: () => void;
  speechEnd: () => void;
}

export class VAD extends EventEmitter<VADEvents> {
  private isSpeaking = false;
  private silenceFrames = 0;
  private speakingFrames = 0;
  
  public get isSpeakingActive(): boolean {
    return this.isSpeaking;
  }
  
  private threshold = 0.008; // Base minimum threshold
  private silencePatience = 18; // ~1.15 seconds of silence patience
  private speechPatience = 1;  // 1 frame patience for instant trigger
  
  // Adaptive noise floor tracking
  private backgroundNoiseRMS = 0.003;

  public setThreshold(val: number) {
    this.threshold = val;
  }

  public getThreshold(): number {
    return this.threshold;
  }

  process(data: Float32Array) {
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      sumSquares += data[i] * data[i];
    }
    const rms = Math.sqrt(sumSquares / data.length);
    
    // Smoothly track background noise floor only during periods of extended silence
    if (!this.isSpeaking) {
      this.backgroundNoiseRMS = this.backgroundNoiseRMS * 0.95 + rms * 0.05;
    }
    
    // The active threshold is adaptive: it scales up with ambient background noise
    // to prevent continuous trigger loops on fan/mic static, but never drops below
    // our calibrated base threshold.
    const activeThreshold = Math.max(this.threshold, this.backgroundNoiseRMS * 2.2);
    
    if (rms > activeThreshold) {
      this.speakingFrames++;
      this.silenceFrames = 0;
      if (!this.isSpeaking && this.speakingFrames > this.speechPatience) {
        this.isSpeaking = true;
        this.emit("speechStart");
      }
    } else {
      this.silenceFrames++;
      this.speakingFrames = 0;
      if (this.isSpeaking && this.silenceFrames > this.silencePatience) {
        this.isSpeaking = false;
        this.emit("speechEnd");
        
        // When speech ends, instantly capture the new noise floor baseline
        this.backgroundNoiseRMS = rms;
      }
    }
  }
}
