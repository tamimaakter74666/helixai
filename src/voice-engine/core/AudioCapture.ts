
import { EventEmitter } from "../utils/EventEmitter";
import { NoiseSuppressor } from "../utils/NoiseSuppressor";

export interface AudioCaptureEvents {
  audio: (data: Float32Array) => void;
}

export class AudioCapture extends EventEmitter<AudioCaptureEvents> {
  private audioCtx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isMuted: boolean = false;
  public noiseSuppressor = new NoiseSuppressor();

  start(stream: MediaStream) {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.source = this.audioCtx.createMediaStreamSource(stream);
    
    // Using ScriptProcessor with 1024 buffer size (64ms @ 16kHz) for low latency
    this.processor = this.audioCtx.createScriptProcessor(1024, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      // Copy data to avoid mutation
      if (!this.isMuted) {
        // Apply WebRTC-style real-time Spectral Subtraction Noise Suppression
        const cleanData = this.noiseSuppressor.process(inputData);
        this.emit("audio", cleanData);
      }
    };

    this.source.connect(this.processor);
    
    // Create a dummy gain node with 0 volume to prevent mic feedback
    const dummyGain = this.audioCtx.createGain();
    dummyGain.gain.value = 0;
    this.processor.connect(dummyGain);
    dummyGain.connect(this.audioCtx.destination);
    // this.processor.connect(this.audioCtx.destination); // DO NOT OUTPUT RAW MIC

  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
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
