
export class MicrophoneManager {
  private stream: MediaStream | null = null;

  async getStream(): Promise<MediaStream> {
    if (this.stream) return this.stream;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      return this.stream;
    } catch (e) {
      console.warn("Microphone access denied:", e);
// eslint-disable-next-line preserve-caught-error
      throw new Error("Microphone permission denied.");
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
