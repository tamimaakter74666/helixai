
import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceManager } from './VoiceManager';
import { VoiceState } from './core/VoiceStateMachine';

// Singleton instance
const voiceManager = new VoiceManager();

export function useVoiceEngine(onCommand: (cmd: string, data?: any) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>(voiceManager.stateMachine.getState());
  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const onCommandRef = useRef(onCommand);
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

    const handleCommand = (cmd: string, data: any) => {
      onCommandRef.current(cmd, data);
    };

    let errorTimeout: NodeJS.Timeout | null = null;
    const handleError = (err: any) => {
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

    voiceManager.on("stateChange", handleStateChanged);
    voiceManager.on("transcript", handleTranscript);
    voiceManager.on("command", handleCommand);
    voiceManager.on("error", handleError);
    voiceManager.speechRecognizer.on("start", handleSpeechStart);
    const handleVolume = (vol: number) => setAudioVolume(vol);
    voiceManager.on("audioVolume", handleVolume);

    return () => {
      voiceManager.off("stateChange", handleStateChanged);
      voiceManager.off("transcript", handleTranscript);
      voiceManager.off("command", handleCommand);
      voiceManager.off("error", handleError);
      voiceManager.speechRecognizer.off("start", handleSpeechStart);
      voiceManager.off("audioVolume", handleVolume);
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
  }, []);
  const respond = useCallback((text: string, voiceType?: "bengali" | "english_female" | "english_male") => {
     if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          
          // An empty or very short text is used to synchronously unlock TTS on user gesture
          if (!text) {
            const silentUtterance = new SpeechSynthesisUtterance(" ");
            silentUtterance.volume = 0;
            window.speechSynthesis.speak(silentUtterance);
            return;
          }

          const utterance = new SpeechSynthesisUtterance(text);
          let langCode = "bn-BD";
          if (voiceType === "english_female" || voiceType === "english_male") {
            langCode = "en-US";
          }
          utterance.lang = langCode;
          
          // Find a matching voice in the browser if possible
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const matchingVoice = voices.find(v => {
              const nameLower = (v.name || "").toLowerCase();
              const langLower = (v.lang || "").toLowerCase();
              
              if (voiceType === "bengali") {
                return langLower.startsWith("bn");
              } else if (voiceType === "english_female") {
                return langLower.startsWith("en") && (
                  nameLower.includes("female") || 
                  nameLower.includes("google") || 
                  nameLower.includes("zira") || 
                  nameLower.includes("samantha") || 
                  nameLower.includes("hazel") || 
                  nameLower.includes("susan")
                );
              } else if (voiceType === "english_male") {
                return langLower.startsWith("en") && (
                  nameLower.includes("male") || 
                  nameLower.includes("david") || 
                  nameLower.includes("ravi") || 
                  nameLower.includes("george") || 
                  nameLower.includes("mark")
                );
              }
              return false;
            });
            
            if (matchingVoice) {
              utterance.voice = matchingVoice;
            } else {
              // fallback by language code match
              const langVoice = voices.find(v => (v.lang || "").toLowerCase().startsWith(langCode.substring(0, 2)));
              if (langVoice) utterance.voice = langVoice;
            }
          }
          
          utterance.onstart = () => {
            voiceManager.stateMachine.transition("Speaking");
          };
          utterance.onend = () => {
            voiceManager.stateMachine.transition("Idle");
          };
          utterance.onerror = () => {
            voiceManager.stateMachine.transition("Idle");
          };

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("SpeechSynthesis error:", err);
        }
     }
  }, []);
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
    error
  };
}
