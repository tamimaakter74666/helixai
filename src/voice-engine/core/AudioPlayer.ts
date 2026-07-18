
import { LoggingManager } from "../utils/LoggingManager";

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private isMuted = false;

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      LoggingManager.info("AudioPlayer", "AudioContext initialized at 24kHz sample rate.");
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      LoggingManager.info("AudioPlayer", "Audio player muted. Stopping all scheduled playbacks.");
      this.stopAll();
    } else {
      LoggingManager.info("AudioPlayer", "Audio player unmuted.");
    }
  }

  getRemainingPlayTimeMs(): number {
    if (!this.audioCtx) return 0;
    const remainingSeconds = this.nextStartTime - this.audioCtx.currentTime;
    return Math.max(0, remainingSeconds * 1000);
  }

  isPlaying(): boolean {
    if (!this.audioCtx) return false;
    return this.audioCtx.currentTime < this.nextStartTime;
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
    
    const chunkDurationMs = Math.round(audioBuffer.duration * 1000);
    const remainingBeforeMs = Math.round((this.nextStartTime - currentTime) * 1000);
    LoggingManager.debug("AudioPlayer", `Enqueued audio chunk. Duration: ${chunkDurationMs}ms. Plays in: ${remainingBeforeMs}ms.`);

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  stopAll() {
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
      this.nextStartTime = 0;
      LoggingManager.info("AudioPlayer", "AudioContext closed and all active playback stopped.");
    }
  }
}
