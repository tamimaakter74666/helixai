const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'src/App.tsx');
let code = fs.readFileSync(file, 'utf8');

// Replace Chunk 2
const oldEnd = `      rec.onend = () => {
        // Auto-restart if we should still be listening
        if (isListeningRef.current || isWakeWordActiveRef.current) {
          try {
            rec.start();
          } catch (e) {
            console.warn("Failed to auto-restart speech recognition:", e);
          }
        }
      };`;
const newEnd = `      rec.onend = () => {
        // Auto-restart if we should still be listening
        if (isListeningRef.current || isWakeWordActiveRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && (isListeningRef.current || isWakeWordActiveRef.current)) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.warn("Failed to auto-restart speech recognition:", e);
              }
            }
          }, 300);
        }
      };`;
code = code.replace(oldEnd, newEnd);

// Replace Chunk 3
const oldLang = `  // Dynamically update Speech Recognition language when user voice preference changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedVoice === "bengali" ? "bn-BD" : "en-US";
      console.log("Speech recognition language updated to:", recognitionRef.current.lang);
    }
  }, [selectedVoice]);`;
const newLang = `  // Dynamically update Speech Recognition language when user voice preference changes
  useEffect(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current.lang = selectedVoice === "bengali" ? "bn-BD" : "en-US";
      console.log("Speech recognition language updated to:", recognitionRef.current.lang);
      const shouldBeRunning = isWakeWordActiveRef.current || isListeningRef.current;
      if (shouldBeRunning) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) {}
          }
        }, 300);
      }
    }
  }, [selectedVoice]);`;
code = code.replace(oldLang, newLang);

// Replace Chunk 4
const oldToggle = `  // Handle auto-starting / stopping wake word and active listening scanner
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
const newToggle = `  // Handle auto-starting / stopping wake word and active listening scanner
  useEffect(() => {
    if (recognitionRef.current) {
      const shouldBeRunning = isWakeWordActive || isListening;
      if (shouldBeRunning) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }, 300);
      } else {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  }, [isWakeWordActive, isListening]);`;
code = code.replace(oldToggle, newToggle);

fs.writeFileSync(file, code);
console.log("SUCCESS");
