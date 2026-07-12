
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
import { VoiceStateMachine, VoiceState } from "./core/VoiceStateMachine";

export class VoiceManager extends EventEmitter<any> {
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

  private ws: WebSocket | null = null;
  private isWakeWordActive = true;

  constructor() {
    super();
    this.setupEvents();
  }

  private setupEvents() {
    this.stateMachine.on("stateChange", (state) => {
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
        for (let i = 0; i < pcmData.length; i++) {
          let s = Math.max(-1, Math.min(1, pcmData[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer) as any));
        const state = this.stateMachine.getState();
        if (state !== "Idle") {
          this.ws.send(JSON.stringify({ audio: base64 }));
        }
      }
    });

    this.vad.on("speechStart", () => {
       if (this.stateMachine.getState() === "Listening") {
         this.emit("userSpeaking", true);
       }
    });

    this.vad.on("speechEnd", () => {
       if (this.stateMachine.getState() === "Listening") {
         this.emit("userSpeaking", false);
       }
    });

    this.speechRecognizer.on("transcript", (text, isFinal) => {
       this.emit("transcript", text, isFinal);
       if (this.stateMachine.getState() === "Idle" || this.stateMachine.getState() === "WakeListening") {
          this.wakeWord.processTranscript(text);
       } else {
          if (isFinal) {
             this.conversation.onUserSpoke(text);
             this.intentRouter.processTranscript(text);
          }
       }
    });
    
    this.speechRecognizer.on("modelSpoke", (text) => {
       this.emit("modelSpoke", text);
    });

    this.speechRecognizer.on("error", (err) => {
       console.warn("[VoiceManager] Speech Recognizer Error:", err);
       this.emit("error", err);
       
       const fatalErrors = ["not-allowed", "service-not-allowed", "language-not-supported"];
       if (fatalErrors.includes(String(err).toLowerCase())) {
         this.stop();
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
       this.emit("command", cmd, data);
    });
  }

  async start(useWakeWord = true) {
    this.isWakeWordActive = useWakeWord;
    try {
      const stream = await this.mic.getStream();
      this.audioPlayer.init();
      
      this.audioCapture.start(stream);
      this.speechRecognizer.start();
      
      this.connectWebSocket();

      if (this.isWakeWordActive) {
        this.stateMachine.transition("WakeListening");
        this.audioPlayer.setMuted(true); // Don't play TTS until wake word
      } else {
        this.stateMachine.transition("Listening");
        this.audioPlayer.setMuted(false);
      }
    } catch (e) {
      this.stateMachine.transition("Error");
      this.emit("error", e);
    }
  }

  private connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${protocol}//${window.location.host}/api/live`);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "audio" && data.audio) {
          if (this.stateMachine.getState() !== "Idle" && this.stateMachine.getState() !== "WakeListening") {
            this.stateMachine.transition("Speaking");
          }
          this.tts.handleAudioChunk(data.audio);
        } else if (data.type === "interrupted") {
          this.tts.stop();
          if (this.stateMachine.getState() === "Speaking") {
            this.stateMachine.transition("Listening");
          }
        } else if (data.type === "command") {
          this.emit("command", data.command, data.data);
        } else if (data.type === "status") {
          this.isStandby = data.data === "standby";
          this.emit("status", data.data);
        } else if (data.type === "live_message") {
          this.speechRecognizer.processLiveMessage(data.data);
        }
      } catch (e) {
        console.warn(e);
      }
    };
    
    this.ws.onclose = () => {
      this.isStandby = true;
      this.emit("status", "standby");
      // auto reconnect if still supposed to be running
      if (this.stateMachine.getState() !== "Error") {
        setTimeout(() => this.connectWebSocket(), 1000);
      }
    };

    this.ws.onerror = () => {
      this.isStandby = true;
      this.emit("status", "standby");
    };
  }

  setLanguage(lang: string) {
    let code = "bn-BD";
    if (lang.includes("english")) code = "en-US";
    this.speechRecognizer.setLanguage(code);
  }

  stop() {
    this.audioCapture.stop();
    this.speechRecognizer.stop();
    this.mic.stop();
    this.audioPlayer.stopAll();
    if (this.ws) {
       this.ws.close();
       this.ws = null;
    }
    this.stateMachine.transition("Idle");
  }
}
