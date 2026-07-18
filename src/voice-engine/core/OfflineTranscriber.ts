export class OfflineTranscriber {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isListening = false;
  private isRecording = false;
  private silenceTimer: any = null;
  private onTranscript: (text: string) => void;
  private language: string = "bn-BD";

  private audioChunks: Float32Array[] = [];

  constructor(onTranscript: (text: string) => void) {
    this.onTranscript = onTranscript;
  }

  setLanguage(lang: string) {
    this.language = lang;
  }

  async start() {
    if (this.isListening) return;
    this.isListening = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      const source = this.audioContext.createMediaStreamSource(this.stream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
         const data = new Float32Array(e.inputBuffer.getChannelData(0));
         
         // VAD Logic
         let sum = 0;
         for (let i = 0; i < data.length; i++) {
           sum += Math.abs(data[i]);
         }
         const averageVolume = sum / data.length;
         
         // simple threshold based on float32 audio (-1 to 1)
         const volumeThreshold = 0.01; 

         if (averageVolume > volumeThreshold) {
           if (!this.isRecording) {
             this.startRecording();
           } else {
             if (this.silenceTimer) {
               clearTimeout(this.silenceTimer);
               this.silenceTimer = null;
             }
           }
         } else {
           if (this.isRecording && !this.silenceTimer) {
             this.silenceTimer = setTimeout(() => {
               this.stopRecording();
             }, 1500);
           }
         }

         if (this.isRecording) {
            this.audioChunks.push(data);
            if (this.audioChunks.length > 300) { // approx 10-15 seconds at 4096 samples per chunk
                this.stopRecording();
            }
         }
      };

      source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination); // Required for script processor to work

    } catch (e) {
      console.error("[OfflineTranscriber] start error:", e);
    }
  }

  stop() {
    this.isListening = false;
    this.stopRecording();
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }



  private startRecording() {
    if (!this.stream) return;
    this.isRecording = true;
    this.audioChunks = [];
    console.log("[OfflineTranscriber] Started recording audio segment");
  }

  private async stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    console.log("[OfflineTranscriber] Stopped recording audio segment");
    
    if (this.audioChunks.length === 0 || !this.audioContext) return;
    
    const chunks = [...this.audioChunks];
    this.audioChunks = [];
    
    try {
      const blob = await this.convertToWav(chunks, this.audioContext.sampleRate);
      await this.transcribeAudio(blob);
    } catch(err) {
      console.error("[OfflineTranscriber] Error processing audio segment:", err);
    }
  }

  private async convertToWav(chunks: Float32Array[], sampleRate: number): Promise<Blob> {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const float32Audio = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      float32Audio.set(chunk, offset);
      offset += chunk.length;
    }

    // Resample to 16kHz
    const targetSampleRate = 16000;
    const OfflineAudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineAudioContextClass(1, Math.ceil(float32Audio.length * targetSampleRate / sampleRate), targetSampleRate);
    const buffer = offlineCtx.createBuffer(1, float32Audio.length, sampleRate);
    buffer.copyToChannel(float32Audio, 0);

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const resampledData = renderedBuffer.getChannelData(0);

    // Create WAV Blob
    const wavBuffer = new ArrayBuffer(44 + resampledData.length * 2);
    const view = new DataView(wavBuffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + resampledData.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, resampledData.length * 2, true);

    let wavOffset = 44;
    for (let i = 0; i < resampledData.length; i++, wavOffset += 2) {
      const s = Math.max(-1, Math.min(1, resampledData[i]));
      view.setInt16(wavOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private async transcribeAudio(blob: Blob) {
    try {
      console.log("[OfflineTranscriber] Sending audio segment for local transcription...");
      const formData = new FormData();
      formData.append("audio", blob, "audio.wav");
      formData.append("language", this.language);

      let fetchUrl = "/api/transcribe";
      const customUrl = localStorage.getItem("ruvi_server_url");
      if (customUrl) {
        fetchUrl = `${customUrl.replace(/\/$/, "")}/api/transcribe`;
      } else {
        const isTauri = (window as any).__TAURI__ !== undefined || 
                        window.location.protocol.startsWith("tauri") || 
                        window.location.hostname === "tauri.localhost";
        if (isTauri) {
          fetchUrl = "https://ais-pre-25gfll5l5kgi5wzrveg5lv-844587094120.asia-southeast1.run.app/api/transcribe";
        }
      }

      const res = await fetch(fetchUrl, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const rawText = await res.text();
        if (!rawText || rawText.trim() === "") {
          console.warn("[OfflineTranscriber] Empty response received from /api/transcribe.");
          return;
        }
        if (rawText.trim().startsWith("<")) {
           console.error("[OfflineTranscriber] Endpoint returned HTML (Proxy/SPA fallback block):", rawText.substring(0, 150));
           return;
        }
        try {
          const data = JSON.parse(rawText);
          if (data.text && data.text.trim().length > 0) {
            console.log("[OfflineTranscriber] Received local transcription:", data.text);
            this.onTranscript(data.text);
          }
        } catch (jsonErr) {
          console.error("[OfflineTranscriber] Failed to parse transcription response JSON:", jsonErr, "Raw response:", rawText);
        }
      } else {
         console.warn("[OfflineTranscriber] Local transcript failed", await res.text());
      }
    } catch (e) {
      if (window.self !== window.top) {
        console.warn("[OfflineTranscriber] Failed to fetch. In AI Studio, audio transcription requires opening the app in a new tab.");
        this.onTranscript(" [Error: Audio upload failed. Please open the app in a new tab to use voice features.] ");
      } else {
        console.error("[OfflineTranscriber] Transcription upload failed", e);
      }
    }
  }
}
