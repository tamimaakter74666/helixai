import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Monitor, Terminal, FileText, Settings, Sparkles, Command as CommandIcon } from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  setActiveTab: (tab: string) => void;
}

export default function CommandPalette({ isOpen, setIsOpen, setActiveTab }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { id: "core", title: "Open Ruvi AI Assistant", icon: <Sparkles className="w-4 h-4 text-cyan-400" /> },
    { id: "smarthome", title: "Open Smart Home Control", icon: <Monitor className="w-4 h-4 text-emerald-400" /> },
    { id: "security", title: "Open Security Vault", icon: <Settings className="w-4 h-4 text-red-400" /> },
    { id: "developer", title: "Open Developer Mode", icon: <Terminal className="w-4 h-4 text-indigo-400" /> },
    { id: "files", title: "Search Everything (Files)", icon: <FileText className="w-4 h-4 text-amber-400" /> },
    { id: "browser", title: "Launch Web Browser", icon: <Search className="w-4 h-4 text-purple-400" /> },
  ];

  const filteredCommands = commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-[10vh]">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={() => setIsOpen(false)}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="flex items-center px-4 py-3 border-b border-slate-800">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input 
              ref={inputRef}
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-white px-4 text-lg font-sans placeholder-slate-500"
            />
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
              <CommandIcon className="w-3 h-3" /> K
            </div>
          </div>
          
          <div className="overflow-y-auto p-2">
            {filteredCommands.length > 0 ? (
              filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    setActiveTab(cmd.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-slate-800 transition-colors group"
                >
                  <div className="w-8 h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/50 transition-colors">
                    {cmd.icon}
                  </div>
                  <span className="text-slate-300 group-hover:text-white transition-colors">{cmd.title}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No results found.
              </div>
            )}
          </div>
          
          <div className="bg-slate-950 px-4 py-2 text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-800">
            <span>Ruvi OS Command Palette</span>
            <span>Use ↑↓ to navigate, ↵ to select</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
