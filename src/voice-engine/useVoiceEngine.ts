
import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceManager } from './VoiceManager';
import { VoiceState } from './core/VoiceStateMachine';

// Singleton instance
const voiceManager = new VoiceManager();

export function useVoiceEngine(onCommand: (cmd: string, data?: unknown) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceManager.stateMachine.getState());
  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [engineMode, setEngineModeState] = useState<"auto" | "gemini" | "local">(voiceManager.getEngineMode());
  const [activeVoiceEngine, setActiveVoiceEngine] = useState<"gemini" | "local">(voiceManager.activeVoiceEngine);
  const [fallbackReason, setFallbackReason] = useState<string>(voiceManager.fallbackReason);
  const [calibrationStatus, setCalibrationStatus] = useState(() => voiceManager.getNoiseCalibrationStatus());
  
  const onCommandRef = useRef(onCommand);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksQueueRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // High-fidelity fallback Speech engine using Google Translate TTS API
  // No OS language packs required, works flawlessly on Windows/Android/iOS
  const playGoogleTTS = useCallback((text: string, lang: string) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    // Split text into safe chunks of <= 150 characters (Google TTS limit)
    const splitTextIntoChunks = (txt: string, maxLength: number = 150): string[] => {
      const sentences = txt.match(/[^.!?।]+[.!?।]?/g) || [txt];
      const chunks: string[] = [];
      let currentChunk = "";

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      return chunks;
    };

    const chunks = splitTextIntoChunks(text);
    audioChunksQueueRef.current = chunks;
    currentChunkIndexRef.current = 0;
    isPlayingRef.current = true;

    const playNext = () => {
      if (!isPlayingRef.current) return;

      const idx = currentChunkIndexRef.current;
      if (idx >= audioChunksQueueRef.current.length) {
        isPlayingRef.current = false;
        voiceManager.stateMachine.transition("Idle");
        return;
      }

      const chunk = audioChunksQueueRef.current[idx];
      currentChunkIndexRef.current = idx + 1;

      if (!chunk.trim()) {
        playNext();
        return;
      }

      const url = `/api/tts?lang=${lang}&text=${encodeURIComponent(chunk)}`;
      const audio = new Audio(url);
      activeAudioRef.current = audio;

      audio.onplay = () => {
        voiceManager.stateMachine.transition("Speaking");
      };

      audio.onended = () => {
        playNext();
      };

      audio.onerror = (e) => {
        console.warn("[GoogleTTS] Error playing chunk, falling back to Web Speech:", chunk, e);
        try {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
            utterance.onstart = () => voiceManager.stateMachine.transition("Speaking");
            utterance.onend = () => playNext();
            utterance.onerror = () => playNext();
            window.speechSynthesis.speak(utterance);
          } else {
            playNext();
          }
        } catch {
          playNext();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name === 'AbortError' || String(err).includes('pause') || String(err).includes('interrupted')) {
            return; // Interrupted by pause(), normal behavior
          }
          console.error("[GoogleTTS] Blocked or failed to play:", err);
          // If audio playback is blocked, fallback to browser SpeechSynthesis to attempt speech
          try {
            if (typeof window !== "undefined" && window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(chunk);
              utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
              utterance.onstart = () => voiceManager.stateMachine.transition("Speaking");
              utterance.onend = () => playNext();
              utterance.onerror = () => playNext();
              window.speechSynthesis.speak(utterance);
            } else {
              playNext();
            }
          } catch {
            playNext();
          }
        });
      }
    };

    playNext();
  }, []);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    const handleStateChanged = (newState: VoiceState) => {
      setVoiceState(newState);
    };

    const handleTranscript = (text: string, final: boolean) => {
      setTranscript(text);
      setIsFinal(final);
    };

    const handleCommand = (cmd: string, data: unknown) => {
      onCommandRef.current(cmd, data);
    };

    let errorTimeout: NodeJS.Timeout | null = null;
    const handleError = (err: unknown) => {
      console.warn("[useVoiceEngine] Error event from voice manager:", err);
      const errStr = String(err || "").toLowerCase();
      if (errStr === "aborted" || errStr === "no-speech" || errStr === "network") {
        return; // Ignore normal lifecycle events and silent retries
      }
      setError(String(err));
      
      if (errorTimeout) clearTimeout(errorTimeout);
      errorTimeout = setTimeout(() => {
        setError(null);
      }, 4000);
    };

    const handleSpeechStart = () => {
      setError(null);
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
    };

    const handleEngineModeChange = (mode: "auto" | "gemini" | "local") => {
      setEngineModeState(mode);
      setFallbackReason(voiceManager.fallbackReason);
    };

    const handleActiveEngineChange = (engine: "gemini" | "local") => {
      setActiveVoiceEngine(engine);
      setFallbackReason(voiceManager.fallbackReason);
    };

    const handleNoiseCalibration = (status: { isCalibrating: boolean; isCalibrated: boolean; noiseFloorDB: number }) => {
      setCalibrationStatus(status);
    };

    voiceManager.on("stateChange", handleStateChanged);
    voiceManager.on("transcript", handleTranscript);
    voiceManager.on("command", handleCommand);
    voiceManager.on("error", handleError);
    voiceManager.speechRecognizer.on("start", handleSpeechStart);
    const handleVolume = (vol: number) => setAudioVolume(vol);
    voiceManager.on("audioVolume", handleVolume);

    voiceManager.on("engineModeChange", handleEngineModeChange);
    voiceManager.on("activeEngineChange", handleActiveEngineChange);
    voiceManager.on("noiseCalibration", handleNoiseCalibration);

    return () => {
      voiceManager.off("stateChange", handleStateChanged);
      voiceManager.off("transcript", handleTranscript);
      voiceManager.off("command", handleCommand);
      voiceManager.off("error", handleError);
      voiceManager.speechRecognizer.off("start", handleSpeechStart);
      voiceManager.off("audioVolume", handleVolume);
      voiceManager.off("engineModeChange", handleEngineModeChange);
      voiceManager.off("activeEngineChange", handleActiveEngineChange);
      voiceManager.off("noiseCalibration", handleNoiseCalibration);
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    voiceManager.start(false);
  }, []);

  const startWakeWordMode = useCallback(() => {
    setError(null);
    voiceManager.start(true);
  }, []);
  const stop = useCallback(() => voiceManager.stop(), []);
  const interrupt = useCallback(() => {
     voiceManager.tts.stop();
     if (activeAudioRef.current) {
       activeAudioRef.current.pause();
       activeAudioRef.current = null;
     }
     isPlayingRef.current = false;
     voiceManager.stateMachine.transition("Idle");
  }, []);
  const respond = useCallback((text: string, voiceType?: "bengali" | "english_female" | "english_male") => {
      // Add spoken text to voiceManager's history to prevent echo loop transcribing AI's own output
      voiceManager.addAISpokenText(text);

      // If the active voice engine is Gemini Live Voice, suppress browser TTS completely!
      if (voiceManager.activeVoiceEngine === "gemini") {
         console.log("Suppressed local browser TTS playback because Gemini Live Voice is active.");
         return;
      }

      // Stop any existing google tts playbacks
      if (activeAudioRef.current) {
        try { activeAudioRef.current.pause(); } catch(e) {}
        activeAudioRef.current = null;
        isPlayingRef.current = false;
      }

      if (!text || !text.trim()) {
        voiceManager.stateMachine.transition("Idle");
        return;
      }

      // Use high-fidelity web-based Google Translate TTS API fallback to bypass OS limitations.
      // This is particularly critical on Windows where native Bengali voices are absent by default.
      const langCode = voiceType === "bengali" ? "bn" : "en";
      playGoogleTTS(text, langCode);
  }, [playGoogleTTS]);
  const setLanguage = useCallback((lang: string) => {
     voiceManager.setLanguage(lang);
  }, []);

  return {
    voiceState,
    transcript,
    isFinal,
    startListening,
    startWakeWordMode,
    stop,
    interrupt,
    respond,
    setLanguage,
    voiceManager,
    audioVolume,
    error,
    engineMode,
    activeVoiceEngine,
    fallbackReason,
    calibrationStatus,
    calibrateNoise: useCallback(() => {
      voiceManager.calibrateNoise();
    }, []),
    setEngineMode: useCallback((mode: "auto" | "gemini" | "local") => {
      voiceManager.setEngineMode(mode);
    }, [])
  };
}
