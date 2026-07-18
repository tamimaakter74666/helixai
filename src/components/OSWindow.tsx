import React, { ReactNode, useState } from "react";
 
import { Minus, X, Maximize2, Minimize2 } from "lucide-react";
 
import { motion } from "motion/react";

interface OSWindowProps {
  title: string;
  icon?: React.ReactNode;
  children: ReactNode;
  defaultWidth?: string;
  defaultHeight?: string;
}

export default function OSWindow({ title, icon, children, defaultWidth = "w-full max-w-4xl", defaultHeight = "h-[70vh]" }: OSWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  if (isClosed) return (
    <div className="flex-1 flex items-center justify-center">
      <button onClick={() => setIsClosed(false)} className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-all">
        Reopen {title}
      </button>
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
      className={`
        bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col mx-auto
        ${isMaximized ? "w-full h-[85vh] rounded-none border-x-0 border-b-0" : `${defaultWidth} ${defaultHeight} rounded-xl`}
      `}
    >
      {/* OS Window Titlebar */}
      <div className="h-10 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-4 select-none shrink-0">
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
          <span className="font-mono text-[11px] tracking-widest uppercase">{title}</span>
        </div>
        
        {/* Window Controls (Mac style, but sci-fi) */}
        <div className="flex items-center gap-2">
          <button className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center hover:bg-emerald-500 text-transparent hover:text-emerald-950 transition-all group">
            <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100" />
          </button>
          <button 
            onClick={() => setIsMaximized(!isMaximized)}
            className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center hover:bg-amber-500 text-transparent hover:text-amber-950 transition-all group"
          >
            {isMaximized ? <Minimize2 className="w-2 h-2 opacity-0 group-hover:opacity-100" /> : <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100" />}
          </button>
          <button 
            onClick={() => setIsClosed(true)}
            className="w-3 h-3 rounded-full bg-pink-500/20 border border-pink-500/50 flex items-center justify-center hover:bg-pink-500 text-transparent hover:text-pink-950 transition-all group"
          >
            <X className="w-2 h-2 opacity-0 group-hover:opacity-100" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        {children}
      </div>
    </motion.div>
  );
}
