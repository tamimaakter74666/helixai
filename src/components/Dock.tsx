import React from "react";
import { motion } from "motion/react";
import { 
  MessageSquare, Brain, Lightbulb, Shield, Code, Palette, 
  Settings, FolderOpen, Mail, Gamepad2, Globe, Command 
} from "lucide-react";

interface DockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface DockProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setIsCommandPaletteOpen: (v: boolean) => void;
}

export default function Dock({ activeTab, setActiveTab, setIsCommandPaletteOpen }: DockProps) {
  const dockItems: DockItem[] = [
    { id: "core", label: "Ruvi AI", icon: <Brain className="w-6 h-6" />, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { id: "browser", label: "Browser", icon: <Globe className="w-6 h-6" />, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    { id: "files", label: "Files", icon: <FolderOpen className="w-6 h-6" />, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { id: "smarthome", label: "Smart Home", icon: <Lightbulb className="w-6 h-6" />, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { id: "security", label: "Security", icon: <Shield className="w-6 h-6" />, color: "text-red-400 bg-red-500/10 border-red-500/20" },
    { id: "developer", label: "Developer", icon: <Code className="w-6 h-6" />, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    { id: "studio", label: "Studio", icon: <Palette className="w-6 h-6" />, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
    { id: "gaming", label: "Gaming", icon: <Gamepad2 className="w-6 h-6" />, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-4xl flex justify-center">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.2 }}
        className="pointer-events-auto bg-slate-950/70 backdrop-blur-2xl border border-slate-700/50 p-2 rounded-2xl flex items-center gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
      >
        {dockItems.map((item) => (
          <div key={item.id} className="relative group">
            <button
              onClick={() => setActiveTab(item.id)}
              className={`relative p-3 rounded-xl transition-all duration-300 transform group-hover:-translate-y-2 group-hover:scale-110 
                ${activeTab === item.id ? "bg-slate-800 shadow-inner" : "hover:bg-slate-800/80"} 
                ${item.color}`}
            >
              {item.icon}
              {activeTab === item.id && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
              )}
            </button>
            {/* Tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {item.label}
            </div>
          </div>
        ))}

        <div className="w-px h-8 bg-slate-700 mx-2" />

        <div className="relative group">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-3 rounded-xl hover:bg-slate-800/80 text-slate-300 transition-all transform group-hover:-translate-y-2 group-hover:scale-110"
          >
            <Command className="w-6 h-6" />
          </button>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Command Palette (⌘K)
          </div>
        </div>
      </motion.div>
    </div>
  );
}
