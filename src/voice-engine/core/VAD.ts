
import { EventEmitter } from "../utils/EventEmitter";

export interface VADEvents {
  speechStart: () => void;
  speechEnd: () => void;
}

export class VAD extends EventEmitter<VADEvents> {
  private isSpeaking = false;
  private silenceFrames = 0;
  private speakingFrames = 0;
  
  private threshold = 0.02; 
  private silencePatience = 20; // about 1 second at 4096 frames/16000Hz
  private speechPatience = 3;

  process(data: Float32Array) {
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      sumSquares += data[i] * data[i];
    }
    const rms = Math.sqrt(sumSquares / data.length);
    
    if (rms > this.threshold) {
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
      }
    }
  }
}
