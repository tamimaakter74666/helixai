
import { AudioPlayer } from "./AudioPlayer";

export class TextToSpeechManager {
  constructor(private audioPlayer: AudioPlayer) {}
  
  handleAudioChunk(base64Data: string) {
    this.audioPlayer.playChunk(base64Data);
  }
  
  setMuted(muted: boolean) {
    this.audioPlayer.setMuted(muted);
  }
  
  stop() {
    this.audioPlayer.stopAll();
  }
}
