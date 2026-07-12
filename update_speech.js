const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isWakeWordActiveRef.current = isWakeWordActive; }, [isWakeWordActive]);
  useEffect(() => { assistantStateRef.current = assistantState; }, [assistantState]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Keep a ref to handleSendMessage to avoid stale closures
  const handleSendMessageRef = useRef<any>(null);

  // Initialize Web Speech Recognition for Wake Word & Interactive input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = selectedVoiceRef.current === "bengali" ? "bn-BD" : "en-US";

      rec.onstart = () => {
        console.log("Speech recognition started");
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[event.results.length - 1][0].transcript.trim();
        console.log("Captured speech:", resultText);

        // Check wake word if active using refs
        if (isWakeWordActiveRef.current && assistantStateRef.current === "idle" && resultText.toLowerCase().includes("ruvi")) {
          triggerWakeWord();
        } else if (assistantStateRef.current === "listening") {
          setInputMessage(resultText);
          if (handleSendMessageRef.current) {
            handleSendMessageRef.current(resultText);
          }
        }
      };

      rec.onerror = (err: any) => {
        console.warn("Speech recognition warning:", err.error);
        if (err.error === "not-allowed") {
          setIsListening(false);
          setAssistantState("idle");
        }
      };

      rec.onend = () => {
        // Auto-restart if we should still be listening
        if (isListeningRef.current || isWakeWordActiveRef.current) {
          try {
            rec.start();
          } catch (e) {
            console.warn("Failed to auto-restart speech recognition:", e);
          }
        }
      };

      recognitionRef.current = rec;

      // Start if initial conditions require it
      if (isWakeWordActiveRef.current || isListeningRef.current) {
        try {
          rec.start();
        } catch (e) {}
      }
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []); // Run EXACTLY ONCE on mount!

  // Keep handleSendMessage up-to-date
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Dynamically update Speech Recognition language when user voice preference changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedVoice === "bengali" ? "bn-BD" : "en-US";
      console.log("Speech recognition language updated to:", recognitionRef.current.lang);
    }
  }, [selectedVoice]);

  // Handle auto-starting / stopping wake word and active listening scanner
  useEffect(() => {
    if (recognitionRef.current) {
      const shouldBeRunning = isWakeWordActive || isListening;
      if (shouldBeRunning) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      } else {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  }, [isWakeWordActive, isListening]);`;

const replacement = `  const isRecognitionActiveRef = useRef(false);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { isWakeWordActiveRef.current = isWakeWordActive; }, [isWakeWordActive]);
  useEffect(() => { assistantStateRef.current = assistantState; }, [assistantState]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Keep a ref to handleSendMessage to avoid stale closures
  const handleSendMessageRef = useRef<any>(null);

  // Initialize Web Speech Recognition for Wake Word & Interactive input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = selectedVoiceRef.current === "bengali" ? "bn-BD" : "en-US";

      rec.onstart = () => {
        isRecognitionActiveRef.current = true;
        console.log("Speech recognition started");
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[event.results.length - 1][0].transcript.trim();
        console.log("Captured speech:", resultText);

        // Check wake word if active using refs
        if (isWakeWordActiveRef.current && assistantStateRef.current === "idle" && resultText.toLowerCase().includes("ruvi")) {
          triggerWakeWord();
        } else if (assistantStateRef.current === "listening") {
          setInputMessage(resultText);
          if (handleSendMessageRef.current) {
            handleSendMessageRef.current(resultText);
          }
        }
      };

      rec.onerror = (err: any) => {
        console.warn("Speech recognition warning:", err.error);
        if (err.error === "not-allowed") {
          setIsListening(false);
          setAssistantState("idle");
        }
        if (err.error === "aborted") {
          isRecognitionActiveRef.current = false;
        }
      };

      rec.onend = () => {
        isRecognitionActiveRef.current = false;
        // Auto-restart if we should still be listening
        if (isListeningRef.current || isWakeWordActiveRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && (isListeningRef.current || isWakeWordActiveRef.current) && !isRecognitionActiveRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.warn("Failed to auto-restart speech recognition:", e);
              }
            }
          }, 250);
        }
      };

      recognitionRef.current = rec;

      // Start if initial conditions require it
      if (isWakeWordActiveRef.current || isListeningRef.current) {
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActiveRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        }, 100);
      }
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []); // Run EXACTLY ONCE on mount!

  // Keep handleSendMessage up-to-date
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Dynamically update Speech Recognition language when user voice preference changes
  useEffect(() => {
    if (recognitionRef.current) {
      const wasRunning = isRecognitionActiveRef.current;
      if (wasRunning) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      recognitionRef.current.lang = selectedVoice === "bengali" ? "bn-BD" : "en-US";
      console.log("Speech recognition language updated to:", recognitionRef.current.lang);
      if (wasRunning) {
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActiveRef.current) {
            try { recognitionRef.current.start(); } catch(e) {}
          }
        }, 250);
      }
    }
  }, [selectedVoice]);

  // Handle auto-starting / stopping wake word and active listening scanner
  useEffect(() => {
    if (recognitionRef.current) {
      const shouldBeRunning = isWakeWordActive || isListening;
      if (shouldBeRunning && !isRecognitionActiveRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      } else if (!shouldBeRunning && isRecognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  }, [isWakeWordActive, isListening]);`;

if (code.includes(target)) {
  fs.writeFileSync(file, code.replace(target, replacement));
  console.log("SUCCESS");
} else {
  console.log("FAILED TO MATCH TARGET");
}
