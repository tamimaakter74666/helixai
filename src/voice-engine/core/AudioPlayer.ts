
export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private isMuted = false;

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  playChunk(base64Data: string) {
    
    if (this.isMuted) return;
    if (!this.audioCtx) this.init();

    const ctx = this.audioCtx;
    if (!ctx) return;
    
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    // Live API returns 16-bit PCM at 24kHz
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  stopAll() {
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
      this.nextStartTime = 0;
    }
  }
}
