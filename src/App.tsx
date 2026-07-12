import React, { useState, useEffect, useRef, useCallback } from "react";
import { useVoiceEngine } from "./voice-engine";
import { WaveformVisualizer } from "./components/WaveformVisualizer";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  ShieldAlert,
  Sliders,
  CheckCircle,
  X,
  Volume2,
  VolumeX,
  Cpu,
  Brain,
  Layers,
  Database,
  Trash2,
  Moon,
  Sun,
  Camera,
  Play,
  RotateCcw,
  Plus,
  Compass,
  Zap,
  Info,
  ExternalLink,
  Wifi,
  Monitor,
  LayoutDashboard,
  PlugZap,
  Eye,
  Heart,
  Workflow,
  Building2,
  RefreshCw,
  Palette,
  Settings2,
  MessageCircle,
  Search,
  Smile,
  Users,
  Network,
  Code,
  ShoppingCart,
  LineChart,
  Calendar,
  Gamepad2,
  Activity,
  Server,
  Terminal as TerminalIcon,
  HardDrive
} from "lucide-react";
import GlobalSidebar from "./components/GlobalSidebar";
import VoiceWaveform from "./components/VoiceWaveform";
import RadarSweep from "./components/RadarSweep";
import SimulatedTerminal from "./components/Terminal";
import ComingSoonOSPanel from "./components/ComingSoonOSPanel";
import OllamaModelManager from "./components/OllamaModelManager";
import OrchestratorEngine from "./components/OrchestratorEngine";
import RuViewAnalytics from "./components/RuViewAnalytics";
import CognitiveEngine from "./components/CognitiveEngine";
import AIAutomation from "./components/AIAutomation";
import KnowledgeSystem from "./components/KnowledgeSystem";
import SelfLearningEngine from "./components/SelfLearningEngine";
import DesktopAgent from "./components/DesktopAgent";
import Dock from "./components/Dock";
import CommandPalette from "./components/CommandPalette";
import SmartHomeOS from "./components/SmartHomeOS";
import SecurityCenter from "./components/SecurityCenter";
import { ChatMessage, MemoryLog, PlannerTask, WhatsAppMessage } from "./types";

export default function App() {
  // Theme & Layout state
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [themeHue, setThemeHue] = useState("0");
  const [uiMode, setUiMode] = useState<"dashboard" | "floating" | "dock" | "split" | "fullscreen" | "messenger">("dashboard");
  const [dashboardLayout, setDashboardLayout] = useState<"balanced" | "immersive" | "compact" | "classic">(
    () => {
      try {
        const saved = localStorage.getItem("ruvi_dashboard_layout");
        return (saved as any) || "balanced";
      } catch (e) {
        return "balanced";
      }
    }
  );

  useEffect(() => {
    try {
      localStorage.setItem("ruvi_dashboard_layout", dashboardLayout);
    } catch (e) {}
  }, [dashboardLayout]);

  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("core");
  const [isSelfUpgrading, setIsSelfUpgrading] = useState(false);

  // Voice & Chat states
  // isListening removed
  // assistantState removed
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "RUVI NEURAL ENGINE V4.0 ONLINE.\n\nআমি প্রস্তুত, বলুন কীভাবে সাহায্য করতে পারি? (Try saying **\"Hey Ruvi\"** or click the mic to wake me up)",
      speakText: "রুভি নিউরাল ইঞ্জিন চালু হয়েছে। আমি প্রস্তুত, বলুন কীভাবে সাহায্য করতে পারি?",
      timestamp: new Date(),
      routingInfo: {
        selectedAI: "Gemini-3-Flash (Auto)",
        reason: "Initial boot sequence."
      }
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isWakeWordActiveRaw, setIsWakeWordActive] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isTTSMuted, setIsTTSMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<"bengali" | "english_female" | "english_male">("bengali");

  const handleVoiceCommand = useCallback((cmd: string, data?: any) => {
    if (cmd === "remove_background" || cmd === "sunset_sky" || cmd === "upscale_4k") {
       runPresetPhotoEdit(cmd === "remove_background" ? "bg" : cmd === "sunset_sky" ? "sunset" : "4k");
    }
  }, []);

  const { voiceState, transcript: voiceTranscript, isFinal, startListening, startWakeWordMode, stop: stopVoice, interrupt: interruptVoice, respond: voiceRespond, setLanguage: setVoiceLanguage, voiceManager, audioVolume, error: voiceError } = useVoiceEngine(handleVoiceCommand);

  // Sync selected voice language to speech recognition engine
  useEffect(() => {
    if (setVoiceLanguage) {
      setVoiceLanguage(selectedVoice);
    }
  }, [selectedVoice, setVoiceLanguage]);

  const prevVoiceStateRef = useRef(voiceState);
  useEffect(() => {
    if (voiceState === "Listening" && (prevVoiceStateRef.current === "WakeListening" || prevVoiceStateRef.current === "Idle")) {
      triggerWakeWord();
    }
    prevVoiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    const handleModelSpoke = (text: string) => {
       setMessages(prev => [...prev, {
         id: Math.random().toString(),
         role: "assistant",
         content: text,
         timestamp: new Date()
       }]);
    };
    const handleUserSpoke = (text: string, final: boolean) => {
       setInputMessage(text);
       if (final && text.trim().length > 0) {
         handleSendMessage(text);
       }
    };
    
    voiceManager.on("modelSpoke", handleModelSpoke);
    voiceManager.on("transcript", handleUserSpoke);
    
    const handleUserSpeaking = (speaking: boolean) => {
       setIsUserSpeaking(speaking);
    };
    voiceManager.on("userSpeaking", handleUserSpeaking);
    
    return () => {
      voiceManager.off("modelSpoke", handleModelSpoke);
      voiceManager.off("transcript", handleUserSpoke);
      voiceManager.off("userSpeaking", handleUserSpeaking);
    };
  }, [voiceManager]);
  
  // Log when a speech recognition network/quota error occurs
  useEffect(() => {
    if (voiceError) {
      console.warn("Voice engine error detected in App.tsx:", voiceError);
    }
  }, [voiceError]);
  

  // Sync mute
  useEffect(() => {
    voiceManager.tts.setMuted(isTTSMuted);
  }, [isTTSMuted]);

  useEffect(() => {
    if (isVoiceEnabled) {
      if (voiceState === "Idle") {
        if (isWakeWordActiveRaw) {
          startWakeWordMode();
        } else {
          startListening();
        }
      }
    } else {
      if (voiceState === "WakeListening" || voiceState === "Listening") {
        stopVoice();
      }
    }
  }, [isVoiceEnabled, isWakeWordActiveRaw, voiceState, startWakeWordMode, startListening, stopVoice]);

  const assistantState = (
    isSelfUpgrading ? "thinking" :
    voiceState === "Listening" ? "listening" :
    voiceState === "WakeListening" ? "wake_listening" :
    voiceState === "Thinking" ? "thinking" :
    voiceState === "Speaking" ? "speaking" :
    "idle"
  ) as "idle" | "listening" | "thinking" | "speaking" | "wake_listening";
  const isListening = voiceState === "Listening" || isUserSpeaking;
  const isWakeWordActive = voiceState === "WakeListening";


  // Multi-Brain Mode
  const [selectedRouterAI, setSelectedRouterAI] = useState<"auto" | "gemini" | "deepseek" | "claude" | "ollama">("auto");

  // Dynamic Holographic Emotion State
  const [detectedEmotion, setDetectedEmotion] = useState<"calm" | "joy" | "sorrow" | "anger" | "surprise">("calm");

  // Memory & Knowledge Logs
  const [memories, setMemories] = useState<MemoryLog[]>([]);
  const [newMemoryKey, setNewMemoryKey] = useState("");
  const [newMemoryValue, setNewMemoryValue] = useState("");

  // Photo editing simulation
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [photoActionName, setPhotoActionName] = useState<string>("");
  const [comparisonPosition, setComparisonPosition] = useState<number>(50);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [photoInstruction, setPhotoInstruction] = useState("");

  // WhatsApp Automation Safety Queue
  const [whatsappQueue, setWhatsappQueue] = useState<WhatsAppMessage[]>([]);

  // Audio Context & TTS references
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat without jumping the main page
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  // Refs to avoid stale closures in event listeners
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const triggerWakeWord = () => {
    playFuturisticAudio(880, "triangle", 0.15);
    setTimeout(() => playFuturisticAudio(1320, "sine", 0.2), 150);
    voiceRespond("হ্যাঁ বলুন, আমি শুনছি। Yes, I am listening.", selectedVoice);
  };


  const handleMicToggle = () => {
    // Sync-unlock the browser SpeechSynthesis audio context in user click
    voiceRespond("", selectedVoice);

    const vs = voiceState;
    if (vs === "Listening" || vs === "Speaking" || vs === "Thinking") {
      if (isWakeWordActiveRaw) {
        // Return to wake word mode instead of turning off entirely
        startWakeWordMode();
      } else {
        setIsVoiceEnabled(false);
        stopVoice();
      }
    } else if (vs === "WakeListening") {
      // User explicitly turned off mic while waiting for wake word
      setIsVoiceEnabled(false);
      stopVoice();
    } else {
      setIsVoiceEnabled(true);
      // Directly start listening without wake-word gate on explicit manual button click!
      startListening();
    }
  };


  const setAssistantState = (state: "idle" | "listening" | "thinking" | "speaking" | "wake_listening") => {
    if (state === "idle") {
      voiceManager.stateMachine.transition("Idle");
    } else if (state === "listening") {
      voiceManager.stateMachine.transition("Listening");
    } else if (state === "thinking") {
      voiceManager.stateMachine.transition("Thinking");
    } else if (state === "speaking") {
      voiceManager.stateMachine.transition("Speaking");
    } else if (state === "wake_listening") {
      voiceManager.stateMachine.transition("WakeListening");
    }
  };
  const setIsListening = (val: boolean) => {};

  const playFuturisticAudio = (freq: number, type: OscillatorType, duration: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      if (type === "triangle") {
        osc.frequency.exponentialRampToValueAtTime(freq * 2, ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked or not supported yet:", e);
    }
  };

  // Voice engine handles TTS internally, so we just pass the text to it
  const speakOutLoud = (text: string, onEndState: "idle" | "listening" = "idle") => {
    if (isTTSMuted) {
      console.log("TTS is muted, skipping speech playback.");
      setAssistantState("idle");
      return;
    }
    voiceRespond(text, selectedVoice);
  };


  // Core Send Message function (interacts with Express server routes /api/chat)
  async function handleSendMessage(customMessage?: string) {
    // Sync-unlock the browser SpeechSynthesis audio context in user click
    voiceRespond("", selectedVoice);

    const textToSend = customMessage || inputMessage;
    if (!textToSend.trim()) return;

    setInputMessage("");
    setAssistantState("thinking");
    setIsListening(false);

    // Add user message to UI
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);

    // Play cyber click sound
    playFuturisticAudio(600, "sine", 0.08);

    try {
      const payload = {
        message: textToSend,
        language: selectedVoice,
        provider: selectedRouterAI,
        history: messagesRef.current.slice(-5).map((m) => ({
          role: m.role,
          content: m.content
        }))
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Server responded with error status");
      }

      const data = await res.json();
      
      if (data.detectedEmotion) {
        setDetectedEmotion(data.detectedEmotion);
      } else {
        setDetectedEmotion("calm");
      }
      
      // Construct AI Assistant response
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.response,
        speakText: data.speakText || data.response,
        command: data.command,
        commandData: data.commandData,
        routingInfo: data.routingInfo || {
          selectedAI: "Gemini-3-Flash (Auto)",
          reason: "Default conversational router synthesis."
        },
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak TTS response out loud if speakText exists and TTS not muted
      if (data.speakText) {
        speakOutLoud(data.speakText);
      } else {
        setAssistantState("idle");
      }

      // Check if any command is executed
      if (data.command && data.command !== "none") {
        executeCommandTrigger(data.command, data.commandData);
      }

    } catch (err) {
      console.error("Chat error:", err);
      const isBn = selectedVoice === "bengali";
      
      // Smart offline local fallback response
      const text = (textToSend || "").toLowerCase().trim();
      let offlineContent = "";
      let offlineSpeak = "";
      
      // Heuristic emotion check
      let localEmotion: "calm" | "joy" | "sorrow" | "anger" | "surprise" = "calm";
      if (text.includes("sad") || text.includes("খারাপ") || text.includes("কষ্ট") || text.includes("দুঃখ") || text.includes("sorry") || text.includes("ভুল")) {
        localEmotion = "sorrow";
      } else if (text.includes("angry") || text.includes("রাগ") || text.includes("খারাপ ব্যবহার") || text.includes("ফালতু") || text.includes("shit") || text.includes("hate") || text.includes("বাজে")) {
        localEmotion = "anger";
      } else if (text.includes("wow") || text.includes("amazing") || text.includes("দারুণ") || text.includes("চমৎকার") || text.includes("অসাধারণ") || text.includes("exciting") || text.includes("অবাক")) {
        localEmotion = "surprise";
      } else if (text.includes("happy") || text.includes("ভালো") || text.includes("আনন্দ") || text.includes("হাসি") || text.includes("love") || text.includes("great") || text.includes("সুন্দর")) {
        localEmotion = "joy";
      }
      setDetectedEmotion(localEmotion);
      
      if (isBn) {
        if (text.includes("হ্যালো") || text.includes("হাই") || text.includes("কেমন আছো") || text.includes("কেমন আছেন") || text.includes("সালাম")) {
          offlineContent = "আমি ভালো আছি! আমি রুভি এআই (Ruvi AI)। অফলাইন লোকাল ব্যাকআপ মোডে আপনার সাথে কথা বলছি। আমি আপনার সব প্রশ্নের উত্তর হয়তো দিতে পারবো না, তবে কিবোর্ড দিয়ে কোনো সাহায্য লাগলে বলতে পারেন।";
          offlineSpeak = "আমি ভালো আছি! অফলাইন লোকাল ব্যাকআপ মোডে আপনার সাথে কথা বলছি।";
        } else if (text.includes("নাম") || text.includes("তুমি কে") || text.includes("তোমার নাম")) {
          offlineContent = "আমি রুভি এআই (Ruvi AI), আপনার পার্সোনাল হলোগ্রাফিক অ্যাসিস্ট্যান্ট। অফলাইন মোডেও আমি আপনার পাশে আছি!";
          offlineSpeak = "আমি রুভি এআই, আপনার পার্সোনাল হলোগ্রাফিক অ্যাসিস্ট্যান্ট।";
        } else if (text.includes("নেটওয়ার্ক") || text.includes("অফলাইন") || text.includes("ইন্টারনেট") || text.includes("কানেকশন")) {
          offlineContent = "আমার মেইন সার্ভারের সাথে হয়তো নেটওয়ার্ক সংযোগ বিচ্ছিন্ন আছে। কোনো চিন্তা নেই, আমি লোকাল অফলাইন মোডে কাজ করছি। দয়া করে কিবোর্ড ব্যবহার করুন।";
          offlineSpeak = "লোকাল অফলাইন মোড সক্রিয় আছে।";
        } else {
          offlineContent = `আমি বর্তমানে অফলাইন লোকাল ব্যাকআপ মোডে কাজ করছি। আপনার বার্তাটি ছিল: "${textToSend}"। সম্পূর্ণ এআই ক্ষমতার জন্য ইন্টারনেটের প্রয়োজন হতে পারে, তবে আমি লোকাল সাবরুটিন দিয়ে আপনাকে সাহায্য করতে প্রস্তুত!`;
          offlineSpeak = "আমি বর্তমানে অফলাইন লোকাল ব্যাকআপ মোডে কাজ করছি।";
        }
      } else {
        if (text.includes("hello") || text.includes("hi") || text.includes("hey") || text.includes("how are you")) {
          offlineContent = "Hello! I am Ruvi AI, operating in local offline backup mode. I can still chat with you here, even without a network connection!";
          offlineSpeak = "Hello! I am Ruvi, running in offline backup mode.";
        } else if (text.includes("name") || text.includes("who are you") || text.includes("your name")) {
          offlineContent = "I am Ruvi, your Holographic OS Assistant. Even though our server uplink is currently offline, my local subroutines are fully functional!";
          offlineSpeak = "I am Ruvi, your holographic assistant.";
        } else if (text.includes("offline") || text.includes("network") || text.includes("internet") || text.includes("wifi")) {
          offlineContent = "Yes, our server uplink is currently down or rate-limited. My cognitive core has switched to local fallback mode to keep you going.";
          offlineSpeak = "Yes, local fallback mode is active.";
        } else {
          offlineContent = `My neural core is currently in offline backup mode. Received input: "${textToSend}". I am fully functional locally to assist you!`;
          offlineSpeak = "My neural core is currently in offline backup mode.";
        }
      }

      const fallbackMsg = {
        id: Math.random().toString(),
        role: "assistant",
        content: offlineContent,
        speakText: offlineSpeak,
        command: "none",
        commandData: {},
        routingInfo: {
          selectedAI: isBn ? "লোকাল অফলাইন মোড" : "Local Offline Core",
          reason: isBn ? "নেটওয়ার্ক অফলাইন ব্যাকআপ" : "Network offline backup active"
        },
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, fallbackMsg as any]);
      speakOutLoud(offlineSpeak, "idle");
    }
  };

  const lowerMsgMatches = (msg: string, list: string[]) => {
    return list.some(item => msg.includes(item));
  };

  // Command Router Action trigger
  const executeCommandTrigger = (command: string, commandData: any) => {
    playFuturisticAudio(1200, "triangle", 0.4);

    if (command === "remove_background") {
      setIsEditingPhoto(true);
      setPhotoActionName("Background Cleared (Transparent Alpha)");
      setUploadedImage("https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop");
      setProcessedImage("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop&bg=transparent");
      setTimeout(() => setIsEditingPhoto(false), 2000);
    } else if (command === "sunset_sky") {
      setIsEditingPhoto(true);
      setPhotoActionName("Sunset Atmosphere Color-grade");
      setUploadedImage("https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop");
      setProcessedImage("https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop");
      setTimeout(() => setIsEditingPhoto(false), 2000);
    } else if (command === "upscale_4k") {
      setIsEditingPhoto(true);
      setPhotoActionName("4K Ultra Fidelity Detail Restoration");
      setUploadedImage("https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop"); // blurry landscape
      setProcessedImage("https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=600&auto=format&fit=crop"); // sharp nature
      setTimeout(() => setIsEditingPhoto(false), 2000);
    } else if (command === "send_whatsapp") {
      const newMsg: WhatsAppMessage = {
        id: Math.random().toString(),
        contact: commandData?.contact || "Unknown Person",
        message: commandData?.message || "হলো একটি সিকিউর হলোগ্রাফিক AI মেসেজ।",
        status: "pending_auth",
        timestamp: new Date()
      };
      setWhatsappQueue((prev) => [newMsg, ...prev]);
    } else if ([
      "volume_set", "brightness_set", "wifi_toggle", "bluetooth_toggle",
      "lock_pc", "sleep_pc", "restart_pc", "shutdown_pc",
      "app_open", "app_close", "screenshot", "ocr_read",
      "file_search", "file_create_folder", "file_rename", "file_delete"
    ].includes(command)) {
      window.dispatchEvent(new CustomEvent("desktop-agent-command", {
        detail: { action: command, params: commandData }
      }));
    }
  };

  // Confirm and Send WhatsApp simulation with safety checks
  const authorizeWhatsAppMessage = (id: string) => {
    playFuturisticAudio(1500, "sine", 0.25);
    setWhatsappQueue((prev) =>
      prev.map((msg) => {
        if (msg.id === id) {
          return { ...msg, status: "sending" };
        }
        return msg;
      })
    );

    // Simulate complete status shortly
    setTimeout(() => {
      setWhatsappQueue((prev) =>
        prev.map((msg) => {
          if (msg.id === id) {
            return { ...msg, status: "delivered" };
          }
          return msg;
        })
      );
      playFuturisticAudio(2000, "sine", 0.15);
    }, 2500);
  };

  const rejectWhatsAppMessage = (id: string) => {
    playFuturisticAudio(350, "sawtooth", 0.3);
    setWhatsappQueue((prev) => prev.filter((msg) => msg.id !== id));
  };

  // Add key value pair to Memory Logs
  const saveMemoryLog = () => {
    if (!newMemoryKey || !newMemoryValue) return;
    const item: MemoryLog = {
      id: Math.random().toString(),
      key: newMemoryKey,
      value: newMemoryValue,
      timestamp: new Date()
    };
    setMemories((prev) => [item, ...prev]);
    setNewMemoryKey("");
    setNewMemoryValue("");
    playFuturisticAudio(950, "sine", 0.15);
  };

  const deleteMemoryLog = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    playFuturisticAudio(300, "triangle", 0.1);
  };

  // Simulated preset photo editing commands
  const runPresetPhotoEdit = (type: string) => {
    let msgText = "";
    if (type === "bg") msgText = "Background remove করো";
    else if (type === "sunset") msgText = "আকাশটা sunset বানাও";
    else if (type === "4k") msgText = "এই ছবিটা 4K করো";

    setInputMessage(msgText);
    handleSendMessage(msgText);
  };

  const handleImageUploadSimulation = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        setProcessedImage(null);
        setPhotoActionName("Custom User Upload (Ready for voice edit commands)");
        playFuturisticAudio(750, "triangle", 0.2);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomPhotoInstruction = () => {
    if (!photoInstruction.trim()) return;
    handleSendMessage(photoInstruction);
    setPhotoInstruction("");
  };

  // JSX helpers for movable panels to support dynamic card rearrangement
  const renderFaceWaveform = () => <WaveformVisualizer state={assistantState} audioVolume={audioVolume} transcript={voiceTranscript} emotion={detectedEmotion} />;

  const renderMemoryVault = () => (
    <div key="memory-vault-card" className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 flex flex-col shadow-[0_0_15px_rgba(0,242,254,0.05)]">
      <div className="flex items-center gap-2 mb-3 border-b border-cyan-500/10 pb-2">
        <Database className="w-4 h-4 text-cyan-400" />
        <span className="font-sans font-medium text-sm tracking-wider text-cyan-300">
          Long-Term Memory Vault
        </span>
      </div>

      {/* Memories List */}
      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
        {memories.map((m) => (
          <div key={m.id} className="flex justify-between items-center bg-slate-950/50 p-2 rounded border border-slate-800 hover:border-cyan-500/15 transition-all text-xs">
            <div className="flex flex-col">
              <span className="text-slate-400 font-mono text-[10px] uppercase font-bold">{m.key}</span>
              <span className="text-white font-medium">{m.value}</span>
            </div>
            <button
              onClick={() => deleteMemoryLog(m.id)}
              className="p-1 text-slate-500 hover:text-pink-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {memories.length === 0 && (
          <p className="text-[11px] text-slate-500 text-center font-mono py-2">Memory Vault empty</p>
        )}
      </div>

      {/* Insert Memory Form */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Key (e.g. Pet Name)"
          value={newMemoryKey}
          onChange={(e) => setNewMemoryKey(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 text-xs px-2.5 py-1.5 rounded-lg text-white placeholder-slate-600 outline-none font-mono"
        />
        <input
          type="text"
          placeholder="Value (e.g. Sparky)"
          value={newMemoryValue}
          onChange={(e) => setNewMemoryValue(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 text-xs px-2.5 py-1.5 rounded-lg text-white placeholder-slate-600 outline-none font-mono"
        />
      </div>
      <button
        onClick={saveMemoryLog}
        className="mt-2 w-full py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all"
      >
        + Store contextual memory
      </button>
    </div>
  );

  return (
    <div className={`h-screen w-full flex overflow-hidden ${
      theme === "dark" 
        ? "bg-slate-950 text-slate-100 selection:bg-cyan-500/30" 
        : "bg-slate-50 text-slate-900 selection:bg-sky-500/20"
      } transition-colors duration-300 font-sans relative`}
      style={{ filter: `hue-rotate(${themeHue}deg)` }}
    >
      
      {/* Listening Global Effect */}
      {assistantState === "listening" && (
        <div className="absolute inset-0 z-[100] pointer-events-none border-[4px] border-cyan-400 shadow-[inset_0_0_50px_rgba(0,242,254,0.3)] animate-pulse transition-all duration-300 flex items-end justify-center pb-12">
          <div className="bg-slate-900/80 backdrop-blur-md px-8 py-4 rounded-full border border-cyan-500/50 shadow-[0_0_20px_rgba(0,242,254,0.5)] flex items-center gap-4">
            <Mic className="w-6 h-6 text-cyan-400 animate-bounce" />
            <span className="text-cyan-300 font-mono tracking-widest text-sm font-semibold">
              RUVI IS LISTENING...
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-6 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0ms]" />
              <span className="w-1.5 h-4 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_150ms]" />
              <span className="w-1.5 h-8 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_300ms]" />
              <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_450ms]" />
              <span className="w-1.5 h-5 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_600ms]" />
            </div>
          </div>
        </div>
      )}

      {/* Decorative Sci-Fi Hologram Overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,242,254,0.07)_0%,transparent_60%)] pointer-events-none z-0" />
      <div className="absolute top-20 right-10 w-[300px] h-[300px] bg-pink-500/5 blur-[120px] pointer-events-none rounded-full z-0" />
      <div className="absolute bottom-20 left-10 w-[300px] h-[300px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full z-0" />

      {/* Global OS Sidebar */}
      {uiMode === "dashboard" && (
        <GlobalSidebar 
          assistantState={assistantState}
          isListening={isListening}
          isWakeWordActive={isWakeWordActive}
          selectedVoice={selectedVoice}
          setSelectedVoice={setSelectedVoice}
          triggerWakeWord={triggerWakeWord}
          interruptVoice={interruptVoice}
          isTTSMuted={isTTSMuted}
          setIsTTSMuted={setIsTTSMuted}
        />
      )}

      {/* Main OS Workspace Area */}
      <div className="flex-1 flex flex-col h-full relative z-40 overflow-hidden">
        {/* Futuristic Navigation Header */}
        {uiMode === "dashboard" && (
        <header className="border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md z-40 shrink-0">
          <div className="w-full px-4 py-2 flex items-center justify-between">
            {/* Top Navigation OS Shell */}
            <div className="flex items-center overflow-x-auto scrollbar-none bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 gap-1 w-full max-w-full">
              {[
                { id: "core", icon: MessageSquare, label: "Core" },
                { id: "orchestrator", icon: Brain, label: "Orchestrator" },
                { id: "agents", icon: Users, label: "Agents" },
                { id: "models", icon: Network, label: "Models" },
                { id: "memory", icon: Database, label: "Memory" },
              { id: "knowledge", icon: Layers, label: "Knowledge" },
              { id: "desktop", icon: Monitor, label: "Desktop" },
              { id: "learning", icon: RefreshCw, label: "Learning" },
              { id: "automation", icon: Workflow, label: "Automation" },
              { id: "ruview", icon: Eye, label: "RuView" },
              { id: "studio", icon: Palette, label: "Studio" },
              { id: "developer", icon: Code, label: "Developer" },
              { id: "marketplace", icon: ShoppingCart, label: "Marketplace" },
              { id: "analytics", icon: LineChart, label: "Analytics" },
              { id: "security", icon: ShieldAlert, label: "Security" },
              { id: "communication", icon: MessageCircle, label: "Comms" },
              { id: "productivity", icon: Calendar, label: "Productivity" },
              { id: "gaming", icon: Gamepad2, label: "Gaming" }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase shrink-0 transition-all ${
                  activeTab === tab.id 
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.2)] border border-cyan-500/30' 
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}>
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Core Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Status Light */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-full border border-cyan-500/15 font-mono text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Orchestrator: ACTIVE</span>
            </div>

            {/* Mute TTS button */}
            <button
              onClick={() => setIsTTSMuted(!isTTSMuted)}
              title={isTTSMuted ? "Unmute Voice output" : "Mute Voice output"}
              className={`p-2 rounded-xl border transition-all duration-300 ${
                isTTSMuted 
                  ? "bg-pink-500/10 text-pink-400 border-pink-500/30" 
                  : "bg-slate-900/80 text-cyan-400 border-cyan-500/20 hover:border-cyan-500/50"
              }`}
            >
              {isTTSMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Settings & Design Menu Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-900/80 text-white border border-slate-800 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 transition-all flex items-center gap-2"
              title="Design & Settings"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden md:inline font-mono text-[10px] uppercase">Design</span>
            </button>
          </div>
        </div>
      </header>
      )}

      {/* Main Grid Content Area */}
      {(uiMode === "dashboard" || uiMode === "split" || uiMode === "fullscreen") && (
        <main className={`flex-1 overflow-y-auto px-4 py-6 relative z-10 w-full`}>
        
        {/* Core Chat & Operations Tab */}
        {activeTab === "core" && (
          <>
            {/* Workspace Grid Controller / Layout Selector Bar */}
            {uiMode !== "fullscreen" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-slate-900/40 backdrop-blur-md border border-cyan-500/10 p-3 rounded-2xl relative z-20">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs uppercase tracking-wider text-slate-300">
                    Workspace Grid Layout:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    id="layout-btn-balanced"
                    onClick={() => { setDashboardLayout("balanced"); playFuturisticAudio(400, "sine", 0.05); }}
                    className={`px-3 py-1.5 text-[10px] font-mono rounded-lg transition-all ${
                      dashboardLayout === "balanced"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_8px_rgba(0,242,254,0.15)]"
                        : "text-slate-500 border border-transparent hover:text-slate-300"
                    }`}
                  >
                    Symmetrical Hub (3:6:3)
                  </button>
                  <button
                    id="layout-btn-immersive"
                    onClick={() => { setDashboardLayout("immersive"); playFuturisticAudio(450, "sine", 0.05); }}
                    className={`px-3 py-1.5 text-[10px] font-mono rounded-lg transition-all ${
                      dashboardLayout === "immersive"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_8px_rgba(0,242,254,0.15)]"
                        : "text-slate-500 border border-transparent hover:text-slate-300"
                    }`}
                  >
                    Wide Chat (2:8:2)
                  </button>
                  <button
                    id="layout-btn-compact"
                    onClick={() => { setDashboardLayout("compact"); playFuturisticAudio(500, "sine", 0.05); }}
                    className={`px-3 py-1.5 text-[10px] font-mono rounded-lg transition-all ${
                      dashboardLayout === "compact"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_8px_rgba(0,242,254,0.15)]"
                        : "text-slate-500 border border-transparent hover:text-slate-300"
                    }`}
                  >
                    Three-Way Grid (4:4:4)
                  </button>
                  <button
                    id="layout-btn-classic"
                    onClick={() => { setDashboardLayout("classic"); playFuturisticAudio(550, "sine", 0.05); }}
                    className={`px-3 py-1.5 text-[10px] font-mono rounded-lg transition-all ${
                      dashboardLayout === "classic"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_8px_rgba(0,242,254,0.15)]"
                        : "text-slate-500 border border-transparent hover:text-slate-300"
                    }`}
                  >
                    Asymmetrical (4:5:3)
                  </button>
                </div>
              </div>
            )}

            <div className={`grid grid-cols-1 gap-6 ${
              uiMode === "fullscreen" ? "lg:grid-cols-1" :
              uiMode === "split" ? "lg:grid-cols-2" :
              "lg:grid-cols-12"
            }`}>
              {/* LEFT COLUMN: Brain & Hardware Orchestrator State */}
              {uiMode !== "fullscreen" && (
                <div className={`${
                  uiMode === "split" ? "lg:order-2" :
                  dashboardLayout === "balanced" ? "lg:col-span-3" :
                  dashboardLayout === "immersive" ? "lg:col-span-2" :
                  dashboardLayout === "compact" ? "lg:col-span-4" :
                  "lg:col-span-4"
                } space-y-6 flex flex-col`}>
                  
                  {/* Holographic Face & Waveform module */}
                  {dashboardLayout !== "compact" && renderFaceWaveform()}

                  {/* WiFi Sensing & Radar Sweep Component */}
                  <RadarSweep />

                  {/* Smart Memory / Context Recall Storage (shown here for classic / compact) */}
                  {(dashboardLayout === "classic" || dashboardLayout === "compact") && renderMemoryVault()}

                  {/* System Terminal Integration */}
                  <SimulatedTerminal />
                </div>
              )}

        {/* MIDDLE COLUMN: Core Voice Assistant Chat Panel */}
        <div className={`${
          uiMode === "fullscreen" ? "lg:h-[85vh]" :
          uiMode === "split" ? "lg:order-1 lg:h-[80vh]" :
          dashboardLayout === "balanced" ? "lg:col-span-6 h-[750px] lg:h-[750px]" :
          dashboardLayout === "immersive" ? "lg:col-span-8 h-[750px] lg:h-[750px]" :
          dashboardLayout === "compact" ? "lg:col-span-4 h-[750px] lg:h-[750px]" :
          "lg:col-span-5 h-[750px] lg:h-[750px]"
        } space-y-6 flex flex-col`}>
          
          {/* Holographic Face & Waveform module (rendered at top of chat for compact layout to conserve horizontal space) */}
          {dashboardLayout === "compact" && renderFaceWaveform()}
          
          {/* Main Interactive Hologram Console */}
          <div className="flex-1 bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_25px_rgba(0,242,254,0.06)] relative">
            
            {/* Header / Router info */}
            <div className="bg-slate-950/90 border-b border-cyan-500/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-[11px] tracking-wider text-slate-300">
                  BRAIN CORE ROUTER:
                </span>
                <span className="text-[11px] font-mono font-bold text-pink-400 bg-pink-500/10 px-1.5 rounded">
                  {selectedRouterAI === "auto" ? "AUTO SELECT" : selectedRouterAI.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-mono">SECURE HOST</span>
              </div>
            </div>

            {/* Router Selector Switches */}
            <div className="p-2 bg-slate-950/40 border-b border-slate-800 grid grid-cols-5 gap-1 text-[10px] font-mono">
              <button
                onClick={() => { setSelectedRouterAI("auto"); playFuturisticAudio(550, "sine", 0.08); }}
                className={`py-1 rounded text-center transition-all ${
                  selectedRouterAI === "auto" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Auto (Router)
              </button>
              <button
                onClick={() => { setSelectedRouterAI("gemini"); playFuturisticAudio(650, "sine", 0.08); }}
                className={`py-1 rounded text-center transition-all ${
                  selectedRouterAI === "gemini" ? "bg-blue-500/20 text-blue-300 font-semibold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Gemini
              </button>
              <button
                onClick={() => { setSelectedRouterAI("deepseek"); playFuturisticAudio(750, "sine", 0.08); }}
                className={`py-1 rounded text-center transition-all ${
                  selectedRouterAI === "deepseek" ? "bg-purple-500/20 text-purple-300 font-semibold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                DeepSeek
              </button>
              <button
                onClick={() => { setSelectedRouterAI("claude"); playFuturisticAudio(850, "sine", 0.08); }}
                className={`py-1 rounded text-center transition-all ${
                  selectedRouterAI === "claude" ? "bg-orange-500/20 text-orange-300 font-semibold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Claude
              </button>
              <button
                onClick={() => { setSelectedRouterAI("ollama"); playFuturisticAudio(950, "sine", 0.08); }}
                className={`py-1 rounded text-center transition-all ${
                  selectedRouterAI === "ollama" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Ollama
              </button>
            </div>

            {/* Chat Messages scroll area */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* Speech bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm relative ${
                      m.role === "user"
                        ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-100 rounded-tr-none"
                        : "bg-slate-950/90 border border-slate-800 text-slate-100 rounded-tl-none"
                    }`}
                  >
                    {/* Speaker name */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`font-mono text-[9px] uppercase tracking-wider font-bold ${
                        m.role === "user" ? "text-cyan-300" : "text-pink-400"
                      }`}>
                        {m.role === "user" ? "User Explorer" : "Ruvi Assistant"}
                      </span>
                      {m.role === "assistant" && m.routingInfo && (
                        <div className="flex items-center gap-2">
                           <span className={`text-[8px] font-mono px-1 rounded ${m.routingInfo.selectedAI?.toLowerCase().includes('ollama') ? 'bg-amber-500/10 text-amber-300' : 'bg-cyan-500/10 text-cyan-300'}`}>
                             {m.routingInfo.selectedAI}
                           </span>
                           {m.routingInfo.latency && (
                             <span className="text-[8px] font-mono text-slate-500 flex items-center gap-0.5">
                               {m.routingInfo.latency}ms
                             </span>
                           )}
                        </div>
                      )}
                    </div>

                    {/* Markdown translation text */}
                    <div className="whitespace-pre-wrap font-sans text-xs md:text-sm">
                      {m.content}
                    </div>

                    {/* Speech / Audio playback status indicator */}
                    {m.speakText && m.role === "assistant" && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-2 justify-between">
                        <button
                          onClick={() => speakOutLoud(m.speakText || "")}
                          className="flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 bg-pink-500/5 px-2 py-0.5 rounded border border-pink-500/10 transition-all font-mono"
                        >
                          <Volume2 className="w-3 h-3 animate-pulse" /> Replay Speech
                        </button>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Routing Decision logs explanation */}
                  {m.role === "assistant" && m.routingInfo && (
                    <div className="mt-1 ml-2 flex items-center gap-1 text-[9px] font-mono text-slate-400 bg-slate-950/30 px-2 py-0.5 rounded border border-slate-900">
                      <Zap className="w-2.5 h-2.5 text-cyan-400" />
                      <span><b>Routing justification:</b> {m.routingInfo.reason}</span>
                    </div>
                  )}
                </div>
              ))}
              
              <div ref={chatEndRef} />
            </div>

            {/* Quick Helper presets */}
            <div className="p-2 border-t border-slate-800 bg-slate-950/20 flex gap-1.5 overflow-x-auto text-[10px] font-mono scrollbar-none">
              <span className="text-slate-500 shrink-0 self-center px-1">Presets:</span>
              <button
                onClick={() => runPresetPhotoEdit("bg")}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 hover:border-cyan-500/30 shrink-0 transition-all"
              >
                "Background remove"
              </button>
              <button
                onClick={() => runPresetPhotoEdit("sunset")}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-pink-300 hover:border-pink-500/30 shrink-0 transition-all"
              >
                "Sunset আকাশ"
              </button>
              <button
                onClick={() => runPresetPhotoEdit("4k")}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-purple-300 hover:border-purple-500/30 shrink-0 transition-all"
              >
                "4K Upscale করো"
              </button>
              <button
                onClick={() => {
                  setInputMessage("Send a message to Rahim: Hi Rahim!");
                  playFuturisticAudio(500, "sine", 0.05);
                }}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-300 hover:border-emerald-500/30 shrink-0 transition-all"
              >
                "WhatsApp Rahim"
              </button>
            </div>

            {/* Interactive Chat inputs bar */}
            <div className="p-4 bg-slate-950/95 border-t border-cyan-500/20">
              {voiceError && (
                <div className="mb-2 text-[10px] md:text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span>Speech input offline ({voiceError}). Keyboard input is fully active!</span>
                </div>
              )}
              <div className="flex gap-2 items-center">
                
                {/* Speech mic trigger */}
                <button
                  onClick={handleMicToggle}
                  className={`p-3 rounded-xl border transition-all duration-300 relative group shrink-0 ${
                    assistantState === "listening" || assistantState === "thinking" || assistantState === "speaking"
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.6)] animate-pulse"
                      : assistantState === "wake_listening"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:bg-emerald-500/25"
                      : "bg-slate-900 text-cyan-400 border-cyan-500/30 hover:border-cyan-500/60"
                  }`}
                  title={
                    assistantState === "listening" || assistantState === "thinking" || assistantState === "speaking"
                      ? "Direct voice active... Click to pause"
                      : assistantState === "wake_listening"
                      ? "Wake word 'Hey Ruvi' active... Click to pause mic"
                      : "Activate voice control"
                  }
                >
                  {assistantState !== "idle" ? (
                    <Mic className={`w-5 h-5 ${assistantState === "listening" ? "animate-bounce" : ""}`} />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                  
                  {/* Glowing halo */}
                  {(assistantState === "listening" || assistantState === "wake_listening") && (
                    <span className={`absolute inset-0 rounded-xl border animate-ping opacity-75 ${
                      assistantState === "listening" ? "border-cyan-300" : "border-emerald-500/30"
                    }`} />
                  )}
                </button>

                {/* Main text input field */}
                <input
                  type="text"
                  placeholder="Ruvi কে কিছু জিজ্ঞেস করুন বা ছবি এডিট করতে বলুন..."
                  value={inputMessage || (!isFinal && voiceTranscript ? voiceTranscript : "")}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  className={`flex-1 bg-slate-900 border focus:border-cyan-500/60 rounded-xl px-4 py-3 text-xs md:text-sm placeholder-slate-500 outline-none transition-all shadow-inner font-sans ${(!isFinal && inputMessage) ? "border-cyan-400 text-cyan-300 italic" : "border-cyan-500/20 text-white"}`}
                />

                {/* Send action */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim()}
                  className={`p-3 rounded-xl border transition-all duration-300 shrink-0 ${
                    inputMessage.trim()
                      ? "bg-gradient-to-r from-cyan-500 to-sky-500 text-white border-cyan-400 shadow-[0_0_10px_rgba(0,242,254,0.3)] hover:scale-105"
                      : "bg-slate-900/60 text-slate-500 border-slate-800 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Real-time wake word setting switch */}
              <div className="mt-3.5 flex items-center justify-between border-t border-slate-800 pt-2 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isWakeWordActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  <span>Speech Wake Word: <b className="text-cyan-400">"Hey Ruvi"</b></span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWakeWordActiveRaw}
                    onChange={(e) => {
                      setIsWakeWordActive(e.target.checked);
                      playFuturisticAudio(e.target.checked ? 1000 : 300, "sine", 0.15);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Photo Editor & WhatsApp Queue */}
        {uiMode !== "fullscreen" && (
          <div className={`${
            uiMode === "split" ? "hidden" :
            dashboardLayout === "balanced" ? "lg:col-span-3" :
            dashboardLayout === "immersive" ? "lg:col-span-2" :
            dashboardLayout === "compact" ? "lg:col-span-4" :
            "lg:col-span-3"
          } space-y-6 flex flex-col`}>
          
          {/* Hardware & System Resources Panel (shown here for non-balanced and non-immersive layouts) */}
          {/* Removed SystemMonitor - now in GlobalSidebar */}

          {/* Smart Memory / Context Recall Storage (shown here for balanced / immersive layouts) */}
          {(dashboardLayout === "balanced" || dashboardLayout === "immersive") && renderMemoryVault()}

          {/* Photo Editing Studio Widget */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(0,242,254,0.05)] relative overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-3 border-b border-cyan-500/10 pb-2">
              <Camera className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="font-sans font-medium text-sm tracking-wider text-pink-400">
                AI Voice Image Editor
              </span>
            </div>

            {/* Instruction input or helper */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Talk to transform photo:</span>
                <span className="text-pink-400 bg-pink-500/10 px-1 rounded text-[9px] uppercase">
                  Ollama / GPU
                </span>
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="e.g. Background রিমুভ করো..."
                  value={photoInstruction}
                  onChange={(e) => setPhotoInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCustomPhotoInstruction();
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-pink-500/40 text-xs px-2.5 py-1.5 rounded-lg text-white placeholder-slate-600 outline-none"
                />
                <button
                  onClick={handleCustomPhotoInstruction}
                  className="bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 text-xs px-2 rounded-lg font-mono transition-all"
                >
                  Run
                </button>
              </div>
            </div>

            {/* Image display canvas with Before/After Slider */}
            <div className="relative w-full aspect-video md:aspect-square bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group">
              {uploadedImage ? (
                <div className="absolute inset-0 select-none overflow-hidden">
                  
                  {/* Processed (After) Image - Shown on top */}
                  {processedImage ? (
                    <img
                      src={processedImage}
                      alt="Processed visual"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-[11px] text-slate-500 font-mono p-4 text-center">
                      <Sparkles className="w-5 h-5 text-pink-500/40 animate-spin mb-2" />
                      <span>Ready. Say "Background remove" or input prompt to edit.</span>
                    </div>
                  )}

                  {/* Original (Before) Image - masked based on slider position */}
                  {uploadedImage && processedImage && (
                    <div
                      className="absolute inset-0 w-full h-full object-cover overflow-hidden border-r-2 border-cyan-400 shadow-[2px_0_10px_rgba(0,242,254,0.4)]"
                      style={{ width: `${comparisonPosition}%` }}
                    >
                      <img
                        src={uploadedImage}
                        alt="Original source"
                        className="absolute inset-0 w-full h-full object-cover max-w-none"
                        style={{ width: "100%" }}
                      />
                      <span className="absolute top-2 left-2 bg-slate-950/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-cyan-300 border border-cyan-500/20 z-10">
                        ORIGINAL
                      </span>
                    </div>
                  )}

                  {processedImage && (
                    <span className="absolute top-2 right-2 bg-pink-950/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-pink-300 border border-pink-500/20 z-10">
                      EDITED
                    </span>
                  )}

                  {/* Split Comparison Slider Input bar overlay */}
                  {processedImage && (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={comparisonPosition}
                      onChange={(e) => setComparisonPosition(Number(e.target.value))}
                      className="absolute bottom-2 left-0 w-full px-2 opacity-80 hover:opacity-100 accent-cyan-400 focus:outline-none z-20 cursor-ew-resize"
                      title="Slide to compare before/after details"
                    />
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4 text-center font-mono text-xs">
                  <ImageIcon className="w-8 h-8 text-slate-700 mb-2" />
                  <span>No image active</span>
                </div>
              )}

              {/* Loading spinner overlay */}
              {isEditingPhoto && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                  <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-2" />
                  <span className="font-mono text-[10px] text-pink-400 tracking-wider animate-pulse">
                    OLLAMA GRAPHIC SEGMENTATION...
                  </span>
                </div>
              )}
            </div>

            {/* Selected Action indicator */}
            <div className="mt-2 bg-slate-950/50 border border-slate-800/80 rounded-lg p-2 flex flex-col gap-0.5 font-mono text-[10px] text-slate-300">
              <span className="text-[9px] text-slate-500 uppercase">Interactive Filter Preset</span>
              <span className="text-white font-medium break-all">{photoActionName}</span>
            </div>

            {/* Custom file upload selector */}
            <div className="mt-3">
              <label className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-950 border border-slate-800 hover:border-pink-500/40 rounded-xl text-slate-300 text-xs font-mono cursor-pointer transition-all">
                <Plus className="w-3.5 h-3.5 text-pink-400" />
                <span>Upload Custom Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUploadSimulation}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* WhatsApp Safe Automation Queue Panel */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_15px_rgba(0,242,254,0.05)] flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-cyan-500/10 pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span className="font-sans font-medium text-sm tracking-wider text-emerald-400">
                  WhatsApp Safety Guard
                </span>
              </div>
              <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-1.5 rounded uppercase font-mono">
                SECURE
              </span>
            </div>

            <p className="text-[10px] text-slate-400 font-mono leading-relaxed mb-3">
              স্বয়ংক্রিয়ভাবে কোনো মেসেজ পাঠানো হয় না। প্রতিবার মেসেজ পাঠাতে চাইলে নিচে **অনুমতি (Authorize)** দিন।
            </p>

            {/* Queue items list */}
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {whatsappQueue.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-xl p-3 text-xs flex flex-col gap-2 transition-all ${
                    item.status === "pending_auth"
                      ? "bg-slate-950/80 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                      : item.status === "sending"
                      ? "bg-slate-950/80 border-cyan-500/30"
                      : "bg-slate-950/50 border-slate-800 opacity-80"
                  }`}
                >
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-white font-bold">To: {item.contact}</span>
                    <span className={`text-[9px] uppercase px-1 rounded ${
                      item.status === "pending_auth" ? "bg-amber-500/20 text-amber-300" :
                      item.status === "sending" ? "bg-cyan-500/20 text-cyan-300 animate-pulse" :
                      "bg-emerald-500/20 text-emerald-300"
                    }`}>
                      {item.status === "pending_auth" ? "Awaiting Auth" :
                       item.status === "sending" ? "Sending..." : "Delivered"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 italic font-sans bg-slate-900/60 p-2 rounded border border-slate-800">
                    "{item.message}"
                  </p>

                  {/* Actions buttons */}
                  {item.status === "pending_auth" && (
                    <div className="flex gap-1.5 mt-1">
                      <button
                        onClick={() => authorizeWhatsAppMessage(item.id)}
                        className="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] rounded uppercase transition-all"
                      >
                        ✔ Authorize
                      </button>
                      <button
                        onClick={() => rejectWhatsAppMessage(item.id)}
                        className="py-1.5 px-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 font-mono text-[10px] rounded uppercase transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {item.status === "sending" && (
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full w-2/3 animate-pulse rounded-full" />
                    </div>
                  )}
                </div>
              ))}

              {whatsappQueue.length === 0 && (
                <div className="text-center py-4 text-slate-600 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                  No pending WhatsApp actions
                </div>
              )}
            </div>
          </div>
        </div>
        )}
        </div>
          </>
        )}
        {/* Orchestrator Tab */}
        {activeTab === "orchestrator" && (
          <div className="animate-in fade-in zoom-in duration-300">
            <OrchestratorEngine />
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === "agents" && (
          <div className="animate-in fade-in zoom-in duration-300 h-full">
            <CognitiveEngine />
          </div>
        )}

        {/* Models Tab */}
        {activeTab === "models" && (
          <div className="animate-in fade-in zoom-in duration-300 h-full overflow-y-auto">
            <OllamaModelManager />
          </div>
        )}

        {/* Memory Tab */}
        {activeTab === "memory" && (
          <ComingSoonOSPanel title="Context & Memory Center" description="Long term memory vault and vector database visualizer." />
        )}

        {/* Knowledge Tab */}
        {activeTab === "knowledge" && (
          <div className="animate-in fade-in zoom-in duration-300 h-full">
            <KnowledgeSystem />
          </div>
        )}

        {/* Desktop Tab */}
        {activeTab === "desktop" && (
          <div className="animate-in fade-in-50 zoom-in duration-300 h-full overflow-y-auto pr-1 pb-12 scrollbar-none">
            <DesktopAgent />
          </div>
        )}

        {/* Learning Tab */}
        {activeTab === "learning" && (
          <div className="animate-in fade-in zoom-in duration-300 h-full">
            <SelfLearningEngine onUpgradingChange={setIsSelfUpgrading} />
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === "automation" && (
          <div className="animate-in fade-in zoom-in duration-300 h-full">
            <AIAutomation />
          </div>
        )}

        {/* RuView Tab */}
        {activeTab === "ruview" && (
          <div className="animate-in fade-in zoom-in duration-300 h-full">
            <RuViewAnalytics />
          </div>
        )}

        {/* Studio Tab */}
        {activeTab === "studio" && (
          <ComingSoonOSPanel title="AI Studio Workspace" description="Advanced image generation, video, and audio editing tools." />
        )}

        {/* Developer Tab */}
        {activeTab === "developer" && (
          <ComingSoonOSPanel title="Developer Environment" description="VS Code integration, Docker container management, and Terminal." />
        )}

        {/* Marketplace Tab */}
        {activeTab === "marketplace" && (
          <ComingSoonOSPanel title="Plugin Marketplace" description="Install third-party tools, MCP plugins, and extensions." />
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <ComingSoonOSPanel title="System Analytics" description="Detailed performance, token usage, and latency metrics." />
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="animate-in fade-in zoom-in duration-300 h-full">
            <SecurityCenter />
          </div>
        )}

        {/* Communication Tab */}
        {activeTab === "communication" && (
          <ComingSoonOSPanel title="Communication Hub" description="WhatsApp, Telegram, Slack, and email automation." />
        )}

        {/* Productivity Tab */}
        {activeTab === "productivity" && (
          <ComingSoonOSPanel title="Productivity Suite" description="Calendar, tasks, and meeting notes." />
        )}

        {/* Gaming Tab */}
        {activeTab === "gaming" && (
          <ComingSoonOSPanel title="Gaming Assistant" description="FPS overlay, performance monitors, and Discord integration." />
        )}

        {/* Smart Home Tab */}
        {activeTab === "smarthome" && (
          <div className="animate-in fade-in zoom-in duration-300 h-full">
            <SmartHomeOS />
          </div>
        )}

        {/* Browser Tab */}
        {activeTab === "browser" && (
          <ComingSoonOSPanel title="Browser OS" description="Playwright-integrated smart browser." />
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <ComingSoonOSPanel title="File Explorer" description="Search Everything and File Organizer." />
        )}

      </main>
      )}

      {/* MESSENGER MODE UI */}
      {uiMode === "messenger" && (
        <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[85vh] max-w-6xl mx-auto font-sans animate-in fade-in-50 duration-300">
          {/* Sidebar */}
          <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col hidden md:flex shrink-0">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <span>Chats</span>
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 flex items-center gap-2 border border-slate-200/50 dark:border-slate-700/50">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Search Agents & Nodes" className="bg-transparent outline-none text-xs w-full dark:text-white" />
              </div>
            </div>

            {/* List of Agents / Nodes as conversations */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {[
                { id: "core", label: "Ruvi Core", desc: "Core AI Brain Node", status: "Active now", initial: "R", color: "bg-blue-500", glow: "shadow-[0_0_10px_rgba(59,130,246,0.5)]" },
                { id: "orchestrator", label: "Orchestrator Node", desc: "Hardware & System Logs", status: "Online", initial: "O", color: "bg-indigo-500" },
                { id: "cognitive", label: "Cognitive Engine", desc: "Memory logs & Logic paths", status: "Synced", initial: "C", color: "bg-fuchsia-500" },
                { id: "automation", label: "Automation Sync", desc: "WhatsApp & Tasks", status: "Listening", initial: "A", color: "bg-orange-500" },
                { id: "knowledge", label: "Knowledge Base", desc: "Vectors & file indexing", status: "Online", initial: "K", color: "bg-teal-500" },
                { id: "learning", label: "Deep Learning", desc: "Self training system", status: "Idle", initial: "L", color: "bg-purple-500" },
                { id: "ruview", label: "RuView Vision", desc: "Visual analytics", status: "Standby", initial: "V", color: "bg-pink-500" },
                { id: "matrix", label: "Matrix Control", desc: "Micro-tools launcher", status: "Ready", initial: "M", color: "bg-cyan-600" },
                { id: "ecosystem", label: "Smart Ecosystem", desc: "Integrations matrix", status: "Connected", initial: "E", color: "bg-rose-500" },
                { id: "mcp", label: "Model Context Protocol", desc: "Model servers link", status: "Active", initial: "P", color: "bg-amber-500" }
              ].map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveTab(agent.id as any)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border text-left transition-all ${
                    activeTab === agent.id
                      ? "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-300 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full ${agent.color} text-white flex items-center justify-center font-bold text-sm relative shrink-0 ${agent.glow || ""}`}>
                    {agent.initial}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-xs truncate">{agent.label}</h3>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono shrink-0">{agent.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{agent.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Pane */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative overflow-hidden">
            
            {/* Conditional Rendering based on Tab inside Messenger */}
            {activeTab === "core" ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between z-10 w-full shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold relative shadow-lg shadow-blue-500/20">
                      R
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Ruvi Assistant</h2>
                      <p className="text-xs text-green-500 flex items-center gap-1 font-mono">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                        Active now
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleMicToggle} 
                      className={`p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${
                        assistantState === "listening" || assistantState === "thinking" || assistantState === "speaking"
                          ? "bg-cyan-500/10 text-cyan-500 animate-pulse border border-cyan-500/30"
                          : assistantState === "wake_listening"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                      }`}
                      title="Toggle Voice Mode"
                    >
                      {assistantState !== "idle" ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Settings"
                    >
                      <Settings2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages scroll area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-950/40">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {m.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mb-1">R</div>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
                        m.role === "user" 
                          ? "bg-blue-500 text-white rounded-br-none" 
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-100 dark:border-slate-700/50"
                      }`}>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                        <div className={`text-[9px] mt-1 text-right block ${m.role === "user" ? "text-blue-100" : "text-slate-400 dark:text-slate-500"}`}>
                          Delivered ✓✓
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Messenger Input bar */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                    <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 border border-slate-200/50 dark:border-slate-700/50">
                      <input
                        type="text"
                        placeholder="Aa"
                        value={inputMessage || (!isFinal && voiceTranscript ? voiceTranscript : "")}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                        className={`flex-1 bg-transparent border-none outline-none text-sm ${(!isFinal && inputMessage) ? "text-blue-500 italic" : "text-slate-800 dark:text-slate-100"}`}
                      />
                      <button className="text-slate-400 hover:text-blue-500 transition-colors">
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleSendMessage()} 
                      disabled={!inputMessage.trim()}
                      className={`p-2.5 rounded-full transition-all ${
                        inputMessage.trim() 
                          ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/10" 
                          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Embedded Dashboards inside Messenger Wrapper */
              <div className="flex-1 overflow-y-auto p-6 bg-slate-950/20">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
                    <div>
                      <h2 className="text-xl font-bold font-sans dark:text-white capitalize">{activeTab} Panel</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Integrated system module dashboard</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab("core")}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg font-mono transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      ← Back to Chat
                    </button>
                  </div>

                  {activeTab === "orchestrator" && <OrchestratorEngine />}
                  {activeTab === "agents" && <CognitiveEngine />}
                  {activeTab === "models" && <OllamaModelManager />}
                  {activeTab === "memory" && <ComingSoonOSPanel title="Context & Memory Center" />}
                  {activeTab === "knowledge" && <KnowledgeSystem />}
                  {activeTab === "desktop" && <DesktopAgent />}
                  {activeTab === "learning" && <SelfLearningEngine onUpgradingChange={setIsSelfUpgrading} />}
                  {activeTab === "automation" && <AIAutomation />}
                  {activeTab === "ruview" && <RuViewAnalytics />}
                  {activeTab === "studio" && <ComingSoonOSPanel title="AI Studio Workspace" />}
                  {activeTab === "developer" && <ComingSoonOSPanel title="Developer Environment" />}
                  {activeTab === "marketplace" && <ComingSoonOSPanel title="Plugin Marketplace" />}
                  {activeTab === "analytics" && <ComingSoonOSPanel title="System Analytics" />}
                  {activeTab === "security" && <ComingSoonOSPanel title="Security Center" />}
                  {activeTab === "communication" && <ComingSoonOSPanel title="Communication Hub" />}
                  {activeTab === "productivity" && <ComingSoonOSPanel title="Productivity Suite" />}
                  {activeTab === "gaming" && <ComingSoonOSPanel title="Gaming Assistant" />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING BUBBLE UI */}
      {uiMode === "floating" && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          {isFloatingOpen && (
            <div className="mb-4 w-80 h-96 bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(0,242,254,0.1)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
              <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs text-cyan-300">RUVI FLOATING</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const modes = ["dashboard", "floating", "dock"] as const;
                      const nextMode = modes[(modes.indexOf(uiMode) + 1) % modes.length];
                      setUiMode(nextMode);
                    }}
                    className="p-1 rounded text-fuchsia-400 hover:bg-slate-800"
                    title="Switch Layout"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsFloatingOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] text-slate-300">
                Awaiting commands in floating mode...
              </div>
              <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ask Ruvi..." 
                  className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                />
                <button className="bg-cyan-500/20 text-cyan-400 p-2 rounded border border-cyan-500/30">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => setIsFloatingOpen(!isFloatingOpen)}
            className="w-14 h-14 rounded-full bg-slate-900 border-2 border-cyan-500 shadow-[0_0_20px_rgba(0,242,254,0.3)] flex items-center justify-center hover:scale-110 transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse">
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
          </button>
        </div>
      )}

      {/* DOCK UI */}
      {uiMode === "dock" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-fuchsia-500/30 rounded-3xl shadow-[0_0_40px_rgba(217,70,239,0.15)] flex items-center p-2 gap-2 pointer-events-auto">
            <button 
              onClick={() => {
                const modes = ["dashboard", "floating", "dock"] as const;
                const nextMode = modes[(modes.indexOf(uiMode) + 1) % modes.length];
                setUiMode(nextMode);
              }}
              className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-fuchsia-400 hover:bg-slate-700 hover:text-fuchsia-300 transition-colors"
              title="Switch Layout"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <div className="w-px h-8 bg-slate-700 mx-1" />
            <button className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 transition-colors">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 hover:bg-fuchsia-500/30 transition-colors">
              <Brain className="w-5 h-5" />
            </button>
            <button className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg -mt-6 border-[3px] border-slate-950 hover:scale-105 transition-transform">
              <Mic className="w-7 h-7" />
            </button>
            <button className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-colors">
              <Workflow className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 hover:bg-pink-500/30 transition-colors">
              <Eye className="w-5 h-5" />
            </button>
            <div className="w-px h-8 bg-slate-700 mx-1" />
            <button className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS / DESIGN MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl shadow-cyan-500/10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                <h2 className="font-mono text-sm font-bold text-slate-200">Design & Layout Setup</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              {/* Layout Mode Selection */}
              <div>
                <h3 className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-3">UI Structure</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                    { id: "split", label: "Split View", icon: Layers },
                    { id: "fullscreen", label: "Fullscreen Chat", icon: MessageSquare },
                    { id: "messenger", label: "Messenger Mode", icon: MessageCircle },
                    { id: "floating", label: "Floating Bubble", icon: Cpu },
                    { id: "dock", label: "Minimal Dock", icon: Monitor }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setUiMode(mode.id as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        uiMode === mode.id 
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300" 
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800"
                      }`}
                    >
                      <mode.icon className="w-5 h-5 mb-2" />
                      <span className="text-xs font-sans font-medium">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Color Shift */}
              <div>
                <h3 className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-3">Color Space</h3>
                <div className="flex justify-between gap-2">
                  {[
                    { hue: "0", label: "Cyan Default", color: "bg-cyan-400" },
                    { hue: "90", label: "Emerald Matrix", color: "bg-emerald-400" },
                    { hue: "180", label: "Pink Neon", color: "bg-pink-400" },
                    { hue: "270", label: "Purple Void", color: "bg-purple-400" }
                  ].map((t) => (
                    <button
                      key={t.hue}
                      onClick={() => setThemeHue(t.hue)}
                      className={`flex-1 flex flex-col items-center gap-2 p-2 rounded-lg border transition-all ${
                        themeHue === t.hue 
                          ? "bg-slate-800 border-slate-500" 
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${t.color} shadow-lg`} style={{ filter: `hue-rotate(${t.hue}deg)` }} />
                      <span className="text-[9px] font-mono text-slate-400 hidden sm:block">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  {theme === "dark" ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                  <span className="text-sm font-sans">Dark Mode UI</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={theme === "dark"}
                    onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold font-sans text-sm rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Main OS Workspace Area */}
      </div>
      
      {/* Dock (visible only in dashboard/fullscreen mode) */}
      {(uiMode === "dashboard" || uiMode === "fullscreen") && (
        <Dock 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          setIsCommandPaletteOpen={setIsCommandPaletteOpen} 
        />
      )}

      {/* Global Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        setIsOpen={setIsCommandPaletteOpen} 
        setActiveTab={setActiveTab} 
      />

    </div>
  );
}
