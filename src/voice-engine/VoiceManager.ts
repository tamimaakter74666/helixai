
import { EventEmitter } from "./utils/EventEmitter";
import { MicrophoneManager } from "./core/MicrophoneManager";
import { AudioCapture } from "./core/AudioCapture";
import { NoiseFilter } from "./core/NoiseFilter";
import { VAD } from "./core/VAD";
import { WakeWordManager } from "./core/WakeWordManager";
import { SpeechRecognizer } from "./core/SpeechRecognizer";
import { ConversationManager } from "./core/ConversationManager";
import { IntentRouter } from "./core/IntentRouter";
import { ContextManager } from "./core/ContextManager";
import { TextToSpeechManager } from "./core/TextToSpeechManager";
import { AudioPlayer } from "./core/AudioPlayer";
import { LoggingManager } from "./utils/LoggingManager";
 
import { VoiceStateMachine } from "./core/VoiceStateMachine";

export interface VoiceManagerEvents {
  stateChange: (state: any) => void;
  transcript: (text: string, final: boolean) => void;
  command: (cmd: string, data?: any) => void;
  error: (err: any) => void;
  audioVolume: (volume: number) => void;
  engineModeChange: (mode: "auto" | "gemini" | "local") => void;
  activeEngineChange: (engine: "gemini" | "local") => void;
  status: (status: string) => void;
  userSpeaking: (speaking: boolean) => void;
  modelSpoke: (text: string) => void;
  noiseCalibration: (status: { isCalibrating: boolean; isCalibrated: boolean; noiseFloorDB: number }) => void;
}

export class VoiceManager extends EventEmitter<VoiceManagerEvents> {
  public mic = new MicrophoneManager();
  public audioCapture = new AudioCapture();
  public noiseFilter = new NoiseFilter();
  public vad = new VAD();
  public wakeWord = new WakeWordManager();
  public speechRecognizer = new SpeechRecognizer();
  public contextManager = new ContextManager();
  public conversation = new ConversationManager(this.contextManager);
  public intentRouter = new IntentRouter();
  public audioPlayer = new AudioPlayer();
  public tts = new TextToSpeechManager(this.audioPlayer);
  public stateMachine = new VoiceStateMachine();
  public isStandby = true;

  private _engineMode: "auto" | "gemini" | "local" = "auto";
  private ws: WebSocket | null = null;
  private isWakeWordActive = true;
  public currentSessionId: string | null = null;
  public isMicActive = false;

  private recentAISpokenTexts: string[] = [];

  public addAISpokenText(text: string) {
    if (!text || !text.trim()) return;
    const clean = this.cleanTextForComparison(text);
    if (clean) {
      this.recentAISpokenTexts.push(clean);
      if (this.recentAISpokenTexts.length > 15) {
        this.recentAISpokenTexts.shift();
      }
    }
  }

  private cleanTextForComparison(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?|]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  public isEchoOfAISpeech(userText: string): boolean {
    const cleanUser = this.cleanTextForComparison(userText);
    if (!cleanUser) return false;

    for (const aiText of this.recentAISpokenTexts) {
      if (cleanUser === aiText) {
        LoggingManager.warn("VoiceManager", `Echo Loop Rejection: Exact match with recent AI spoken text: "${userText}"`);
        return true;
      }
      if (cleanUser.length > 4 && (aiText.includes(cleanUser) || cleanUser.includes(aiText))) {
        LoggingManager.warn("VoiceManager", `Echo Loop Rejection: Substring match. User text: "${userText}", matched recent AI text: "${aiText}"`);
        return true;
      }
      const similarity = this.calculateSimilarity(cleanUser, aiText);
      if (similarity > 0.75) {
        LoggingManager.warn("VoiceManager", `Echo Loop Rejection: High similarity (${Math.round(similarity * 100)}%). User text: "${userText}", matched recent AI text: "${aiText}"`);
        return true;
      }
    }
    return false;
  }

  public isNoiseOrInaudible(text: string): boolean {
    if (!text || !text.trim()) return true;
    const clean = text.toLowerCase().trim();
    const cleanNoPunct = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?|]/g, "").replace(/\s+/g, " ").trim();
    
    // Check for common inaudible/noise patterns and continuous-speech-recognition hallucinations during silence
    if (
      clean.includes("inaudible") ||
      clean.includes("[inaudible]") ||
      clean.includes(">>") ||
      clean.includes("<<") ||
      clean.includes("[ অস্পষ্ট ]") || // Bengali inaudible bracket
      clean.includes("অস্পষ্ট") || // Bengali word for unclear/inaudible
      clean === "[laughter]" ||
      clean === "[cough]" ||
      clean === "[gasp]" ||
      clean === "[music]" ||
      clean === "[noise]" ||
      clean === "[whispering]" ||
      clean === "[sigh]" ||
      clean === "unknown" ||
      cleanNoPunct === "thanks for watching" ||
      cleanNoPunct === "thank you" ||
      cleanNoPunct === "thank you very much"
    ) {
      return true;
    }

    // If it is just non-verbal characters/punctuation, or empty after cleaning
    const alphanumeric = clean.replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, "").trim();
    if (alphanumeric.length === 0) {
      return true;
    }

    // Single-character noise check (ignore single letters/numbers representing static hits)
    if (alphanumeric.length === 1 && !/[\u0980-\u09FF]/.test(alphanumeric)) {
      return true;
    }

    return false;
  }

  private calculateSimilarity(s1: string, s2: string): number {
    const words1 = s1.split(" ");
    const words2 = s2.split(" ");
    const intersection = words1.filter(w => words2.includes(w));
    const score = (2.0 * intersection.length) / (words1.length + words2.length);
    return score;
  }

  constructor() {
    super();
    this.setupEvents();
    
    // Bind noise suppressor callbacks to emit events
    this.audioCapture.noiseSuppressor.onCalibrationStart = () => {
      this.emit("noiseCalibration", this.getNoiseCalibrationStatus());
    };
    this.audioCapture.noiseSuppressor.onCalibrationComplete = (status) => {
      // Calculate background noise RMS from DB
      // dB = 20 * log10(rms) => rms = 10^(dB/20)
      const noiseRMS = Math.pow(10, status.noiseFloorDB / 20);
      // Set the VAD threshold dynamically above the calibrated noise floor!
      // We use a multiplier of 2.2 with a safe minimum of 0.006 to prevent false VAD triggers in silent or noisy rooms
      const dynamicThreshold = Math.max(0.006, noiseRMS * 2.2);
      this.vad.setThreshold(dynamicThreshold);
      LoggingManager.info("VAD", `VAD threshold dynamically updated to ${dynamicThreshold.toFixed(4)} based on calibrated noise floor of ${status.noiseFloorDB.toFixed(1)}dB (noise RMS: ${noiseRMS.toFixed(4)}).`);
      this.emit("noiseCalibration", this.getNoiseCalibrationStatus());
    };
  }

  public getEngineMode(): "auto" | "gemini" | "local" {
    return this._engineMode;
  }

  public setEngineMode(mode: "auto" | "gemini" | "local") {
    this._engineMode = mode;
    this.emit("engineModeChange", mode);
    this.emit("activeEngineChange", this.activeVoiceEngine);
    
    // Dynamically adjust local speech recognition based on new engine selection
    if (this.isMicActive && this.stateMachine.getState() !== "Idle" && this.stateMachine.getState() !== "Speaking") {
      if (this.activeVoiceEngine === "local") {
        this.speechRecognizer.start();
      } else {
        this.speechRecognizer.stop();
      }
    }
  }

  public get activeVoiceEngine(): "gemini" | "local" {
    if (this._engineMode === "local") {
      return "local";
    }
    // If the websocket connection is in standby (offline/disconnected/rate limited/quota hit),
    // we MUST fallback to "local" to enable local speech recognition and HTTP API fallback.
    return !this.isStandby ? "gemini" : "local";
  }

  public get fallbackReason(): string {
    if (this._engineMode === "local") {
      return "Local TTS selected manually";
    }
    if (this._engineMode === "gemini" && this.isStandby) {
      return "Quota finished / API limit";
    }
    if (this._engineMode === "auto" && this.isStandby) {
      return "Internet / API unavailable";
    }
    return "";
  }

  private setupEvents() {
    this.stateMachine.on("stateChange", (state) => {
      LoggingManager.info("VoiceStateMachine", `Engine state transition -> ${state}`);
      if (state === "Speaking") {
         this.audioCapture.setMuted(true);
         this.speechRecognizer.stop();
      } else {
         this.audioCapture.setMuted(false);
         // Resume speech recognizer if not idle and active voice engine is local
         if (state !== "Idle" && state !== "Sleeping") {
             if (this.activeVoiceEngine === "local") {
                 this.speechRecognizer.start();
             } else {
                 this.speechRecognizer.stop();
             }
         }
      }
      this.emit("stateChange", state);
    });

    this.audioCapture.on("audio", (pcmData) => {
      this.vad.process(pcmData);
      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < pcmData.length; i++) {
        sum += pcmData[i] * pcmData[i];
      }
      const rms = Math.sqrt(sum / pcmData.length);
      this.emit("audioVolume", rms);
      // Send audio to Live API if connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // base64 encode
        const buffer = new ArrayBuffer(pcmData.length * 2);
        const view = new DataView(buffer);
        const isSpeaking = this.vad.isSpeakingActive;
        
        for (let i = 0; i < pcmData.length; i++) {
          // Soft-gate instead of hard-cut: reduce quiet background noise by 85% instead of cutting off completely.
          // This keeps speech natural and prevents clipping if VAD is slightly off.
          const sampleVal = isSpeaking ? pcmData[i] : (pcmData[i] * 0.15);
          const s = Math.max(-1, Math.min(1, sampleVal));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))));
        const state = this.stateMachine.getState();
        const isPlaying = this.audioPlayer.isPlaying();
        // Only stream microphone audio to Gemini Live when state is "Listening" (said wake word or manually triggered) and not playing audio
        if (state === "Listening" && !isPlaying) {
          this.ws.send(JSON.stringify({ audio: base64 }));
        }
      }
    });

    this.vad.on("speechStart", () => {
       if (this.stateMachine.getState() === "Listening") {
         LoggingManager.info("VAD", "Speech detected start (User started speaking).");
         this.emit("userSpeaking", true);
       }
    });

    this.vad.on("speechEnd", () => {
       if (this.stateMachine.getState() === "Listening") {
         LoggingManager.info("VAD", "Speech detected end (User stopped speaking/silence).");
         this.emit("userSpeaking", false);
       }
    });

    this.speechRecognizer.on("transcript", (text, isFinal) => {
       const state = this.stateMachine.getState();
       const isPlaying = this.audioPlayer.isPlaying();
       if (state === "Speaking" || isPlaying) {
           LoggingManager.warn("VoiceManager", `Ignored transcript during active voice output: "${text}" (isFinal: ${isFinal})`);
           return; // Ignore transcripts while the AI itself is speaking or playing audio
       }
       if (this.isNoiseOrInaudible(text)) {
           LoggingManager.warn("VoiceManager", `Ignored noise/inaudible transcript: "${text}"`);
           return;
       }
       if (this.isEchoOfAISpeech(text)) {
           return; // Already logged inside isEchoOfAISpeech
       }
       
       LoggingManager.info("VoiceManager", `Transcript recognized: "${text}" (isFinal: ${isFinal})`);
       this.emit("transcript", text, isFinal);
       
       if (state === "Idle" || state === "WakeListening") {
          this.wakeWord.processTranscript(text);
       } else {
          if (isFinal) {
             LoggingManager.success("VoiceManager", `Processing final user speech command: "${text}"`);
             this.conversation.onUserSpoke(text);
             this.intentRouter.processTranscript(text);
          }
       }
    });
    
    this.speechRecognizer.on("modelSpoke", (text) => {
       this.addAISpokenText(text);
       this.emit("modelSpoke", text);
    });

    this.speechRecognizer.on("error", (err) => {
       console.warn("[VoiceManager] Speech Recognizer Error:", err);
       this.emit("error", err);
       
       const fatalErrors = ["not-allowed", "service-not-allowed", "language-not-supported"];
       if (fatalErrors.includes(String(err).toLowerCase())) {
         this.stopResources();
         this.stateMachine.transition("Error");
       }
    });

    this.wakeWord.on("wakeWordDetected", () => {
       if (this.stateMachine.getState() === "Idle" || this.stateMachine.getState() === "WakeListening") {
          this.stateMachine.transition("Listening");
          this.audioPlayer.setMuted(false);
       }
    });

    this.intentRouter.on("command", (cmd, data) => {
       LoggingManager.success("VoiceManager", `IntentRouter matched local command: "${cmd}"`, data);
       this.emit("command", cmd, data);
    });
  }

  public stopResources() {
    this.isMicActive = false;
    this.audioCapture.stop();
    this.speechRecognizer.stop();
    this.mic.stop();
    this.audioPlayer.stopAll();
    if (this.ws) {
       this.ws.close();
       this.ws = null;
    }
  }

  async start(useWakeWord = true) {
    this.isWakeWordActive = useWakeWord;
    this.currentSessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    this.isMicActive = true;
    
    // Synchronously transition state to prevent multiple concurrent start triggers or infinite loops
    if (this.isWakeWordActive) {
      this.stateMachine.transition("WakeListening");
      this.audioPlayer.setMuted(true); // Don't play TTS until wake word
    } else {
      this.stateMachine.transition("Listening");
      this.audioPlayer.setMuted(false);
    }

    try {
      const stream = await this.mic.getStream();
      if (!stream) throw new Error("Could not get microphone stream");
      this.audioPlayer.init();
      
      this.audioCapture.start(stream);
      // Auto-calibrate background noise spectrum for 1 second on microphone activation
      this.audioCapture.noiseSuppressor.startCalibration();
      
      if (this.activeVoiceEngine === "local") {
        this.speechRecognizer.start();
      } else {
        this.speechRecognizer.stop();
      }
      
      this.connectWebSocket();
    } catch (e) {
      this.stopResources();
      this.stateMachine.transition("Error");
      this.emit("error", e);
    }
  }

  private connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const sessionId = this.currentSessionId || "session_" + Date.now();
    LoggingManager.info("VoiceManager", "Connecting to Gemini Live WebSocket...", { sessionId });
    
    const geminiKey = localStorage.getItem("ruvi_gemini_api_key") || "";
    const openrouterKey = localStorage.getItem("ruvi_openrouter_api_key") || "";
    
    let wsUrl = `${protocol}//${window.location.host}/api/live?sessionId=${sessionId}`;
    const customUrl = localStorage.getItem("ruvi_server_url");
    
    if (customUrl) {
      const cleaned = customUrl.replace(/^http/, "ws").replace(/\/$/, "");
      wsUrl = `${cleaned}/api/live?sessionId=${sessionId}`;
    } else {
      const isTauri = (window as any).__TAURI__ !== undefined || 
                      window.location.protocol.startsWith("tauri") || 
                      window.location.hostname === "tauri.localhost";
      if (isTauri) {
        const defaultSharedUrl = "https://ais-pre-25gfll5l5kgi5wzrveg5lv-844587094120.asia-southeast1.run.app".replace(/^http/, "ws");
        wsUrl = `${defaultSharedUrl}/api/live?sessionId=${sessionId}`;
      }
    }

    if (geminiKey) {
      wsUrl += `&geminiKey=${encodeURIComponent(geminiKey)}`;
    }
    if (openrouterKey) {
      wsUrl += `&openrouterKey=${encodeURIComponent(openrouterKey)}`;
    }

    this.ws = new WebSocket(wsUrl);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "audio" && data.audio) {
          if (this.activeVoiceEngine === "gemini") {
            if (this.stateMachine.getState() !== "Idle" && this.stateMachine.getState() !== "WakeListening") {
              this.stateMachine.transition("Speaking");
            }
            this.tts.handleAudioChunk(data.audio);
          }
        } else if (data.type === "interrupted") {
          LoggingManager.warn("VoiceManager", "Gemini Live playback interrupted by user or model.");
          this.tts.stop();
          if (this.stateMachine.getState() === "Speaking") {
            this.stateMachine.transition("Listening");
          }
        } else if (data.type === "command") {
          LoggingManager.success("VoiceManager", `Received autonomous command from Gemini Live: "${data.command}"`, data.data);
          this.emit("command", data.command, data.data);
        } else if (data.type === "status") {
          this.isStandby = data.data === "standby";
          LoggingManager.info("VoiceManager", `Gemini Live connection status: ${data.data}`);
          this.emit("status", data.data);
          this.emit("activeEngineChange", this.activeVoiceEngine);
          if (this.isMicActive && this.stateMachine.getState() !== "Idle" && this.stateMachine.getState() !== "Speaking") {
            if (this.activeVoiceEngine === "local") {
              this.speechRecognizer.start();
            } else {
              this.speechRecognizer.stop();
            }
          }
        } else if (data.type === "live_message") {
          if (this.activeVoiceEngine === "gemini") {
            const micSessionActive = this.isMicActive;
            const transcriptIsUserSpeech = !!(data.data?.serverContent?.inputTranscription || data.data?.serverContent?.interimInputTranscription);
            const incomingSessionId = data.sessionId;
            const currentSessionId = this.currentSessionId;

            // Extract text for logging
            const text = data.data?.serverContent?.inputTranscription?.text ||
                         data.data?.serverContent?.interimInputTranscription?.text ||
                         data.data?.clientContent?.turns?.[0]?.parts?.[0]?.text ||
                         data.data?.serverContent?.modelTurn?.parts?.[0]?.text ||
                         "";

            let origin = "Unknown";
            if (data.data?.serverContent?.inputTranscription || data.data?.serverContent?.interimInputTranscription) {
              origin = "Gemini Live (Real-Time)";
            } else if (data.data?.clientContent?.turns) {
              origin = "Gemini Live (History/Replay)";
            } else if (data.data?.serverContent?.modelTurn) {
              origin = "Gemini Live (Model Response)";
              if (text) {
                this.addAISpokenText(text);
                this.emit("modelSpoke", text);
                LoggingManager.success("VoiceManager", `Ruvi (Model Response): "${text}"`);
              }
            }

            let isNoiseOrInaudibleUserSpeech = false;
            if (transcriptIsUserSpeech && text.trim()) {
              let shouldIgnore = false;
              if (this.isNoiseOrInaudible(text)) {
                LoggingManager.warn("VoiceManager", `Gemini Live inputTranscription ignored (Noise/Inaudible): "${text}"`);
                shouldIgnore = true;
                isNoiseOrInaudibleUserSpeech = true;
              } else if (!micSessionActive) {
                LoggingManager.warn("VoiceManager", `Gemini Live inputTranscription ignored: Microphone is not active. Text: "${text}"`);
                shouldIgnore = true;
              } else if (incomingSessionId !== currentSessionId) {
                LoggingManager.warn("VoiceManager", `Gemini Live inputTranscription ignored: Session ID mismatch. Text: "${text}"`);
                shouldIgnore = true;
              } else if (this.stateMachine.getState() === "Speaking") {
                LoggingManager.warn("VoiceManager", `Gemini Live inputTranscription ignored: AI is currently speaking. Text: "${text}"`);
                shouldIgnore = true;
              } else if (this.isEchoOfAISpeech(text)) {
                shouldIgnore = true;
              }
              
              if (!shouldIgnore) {
                LoggingManager.success("VoiceManager", `Gemini Live user transcript: "${text}"`);
              }
            }

            const serverContent = data.data?.serverContent;
            if (serverContent?.turnComplete) {
              const remainingTimeMs = this.audioPlayer.getRemainingPlayTimeMs();
              LoggingManager.info("VoiceManager", `Gemini Live turn complete. Remaining audio playback: ${Math.round(remainingTimeMs)}ms. Scheduling Listening state transition.`);
              
              setTimeout(() => {
                if (this.stateMachine.getState() === "Speaking") {
                  LoggingManager.success("VoiceManager", "Playback completed. Transitioning back to Listening.");
                  this.stateMachine.transition("Listening");
                }
              }, remainingTimeMs + 200);
            }

            if (isNoiseOrInaudibleUserSpeech) {
              // Ignore transcript but still process the rest of live message
              const cleanedData = JSON.parse(JSON.stringify(data.data));
              if (cleanedData.serverContent) {
                delete cleanedData.serverContent.inputTranscription;
                delete cleanedData.serverContent.interimInputTranscription;
              }
              this.speechRecognizer.processLiveMessage(cleanedData);
            } else {
              this.speechRecognizer.processLiveMessage(data.data);
            }
          }
        }
      } catch (e) {
        console.warn(e);
      }
    };
    
    this.ws.onclose = () => {
      LoggingManager.warn("VoiceManager", "Gemini Live WebSocket connection closed.");
      this.isStandby = true;
      this.emit("status", "standby");
      this.emit("activeEngineChange", this.activeVoiceEngine);
      if (this.isMicActive && this.stateMachine.getState() !== "Idle" && this.stateMachine.getState() !== "Speaking") {
        if (this.activeVoiceEngine === "local") {
          this.speechRecognizer.start();
        } else {
          this.speechRecognizer.stop();
        }
      }
      // auto reconnect if still supposed to be running
      if (this.isMicActive && this.stateMachine.getState() !== "Error") {
        setTimeout(() => this.connectWebSocket(), 1000);
      }
    };

    this.ws.onerror = (err) => {
      LoggingManager.error("VoiceManager", "Gemini Live WebSocket error occurred.", err);
      this.isStandby = true;
      this.emit("status", "standby");
      this.emit("activeEngineChange", this.activeVoiceEngine);
    };
  }

  setLanguage(lang: string) {
    let code = "bn-BD";
    if (lang.includes("english")) code = "en-US";
    this.speechRecognizer.setLanguage(code);
  }

  calibrateNoise() {
    this.audioCapture.noiseSuppressor.startCalibration();
  }

  getNoiseCalibrationStatus() {
    return this.audioCapture.noiseSuppressor.getCalibrationStatus();
  }

  stop() {
    this.stopResources();
    this.stateMachine.transition("Idle");
  }
}
