
import { EventEmitter } from "../utils/EventEmitter";

export interface AudioCaptureEvents {
  audio: (data: Float32Array) => void;
}

export class AudioCapture extends EventEmitter<AudioCaptureEvents> {
  private audioCtx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  start(stream: MediaStream) {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.source = this.audioCtx.createMediaStreamSource(stream);
    
    // Using ScriptProcessor for simplicity and compatibility in 16kHz
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      // Copy data to avoid mutation
      this.emit("audio", new Float32Array(inputData));
    };

    this.source.connect(this.processor);
    
    // Create a dummy gain node with 0 volume to prevent mic feedback
    const dummyGain = this.audioCtx.createGain();
    dummyGain.gain.value = 0;
    this.processor.connect(dummyGain);
    dummyGain.connect(this.audioCtx.destination);
    // this.processor.connect(this.audioCtx.destination); // DO NOT OUTPUT RAW MIC

  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
