const fs = require('fs');
const file = 'src/components/WaveformVisualizer.tsx';

const code = `
import React, { useEffect, useRef } from "react";

export function WaveformVisualizer({ 
  state, 
  audioVolume = 0,
  transcript = ""
}: { 
  state: "idle" | "listening" | "thinking" | "speaking",
  audioVolume?: number,
  transcript?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;
    
    // Config
    const bars = 40;
    const barWidth = 4;
    const barGap = 2;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const totalWidth = bars * (barWidth + barGap);
      const startX = (width - totalWidth) / 2;
      
      // Smooth out the volume a bit for visuals
      const normalizedVol = Math.min(1, Math.max(0, audioVolume * 5)); // amplify slightly
      
      for (let i = 0; i < bars; i++) {
        let barHeight = 4; // idle minimum height

        if (state === "speaking") {
          // Dynamic visualizer simulating speech volume (agent speaking)
          const frequency = 0.2;
          const amplitude = Math.sin(phase + i * frequency) * Math.cos(phase * 0.8 - i * 0.1);
          const randomFactor = Math.random() * 0.5 + 0.5;
          barHeight = 10 + Math.abs(amplitude) * 30 * randomFactor;
        } else if (state === "listening") {
          // Real volume based wave!
          const distance = Math.abs((bars/2) - i) / (bars/2); // 0 at center, 1 at edges
          const bell = Math.max(0, 1 - distance * distance); // bell curve
          
          // Use a baseline pulse + real volume
          const pulse = Math.sin(phase + i * 0.15) * 0.2 + 0.8;
          
          barHeight = 4 + (normalizedVol * 40 * bell * pulse);
        } else if (state === "thinking") {
          // Scanning/loading effect
          const activeIndex = Math.floor((Math.sin(phase * 2) + 1) / 2 * bars);
          const dist = Math.abs(activeIndex - i);
          barHeight = dist < 3 ? 20 - dist * 5 : 4;
        } else {
          // idle
          barHeight = 4;
        }

        const x = startX + i * (barWidth + barGap);
        const y = centerY - barHeight / 2;
        
        ctx.fillStyle = state === "speaking" ? "#00f2fe" : state === "listening" ? "#10b981" : state === "thinking" ? "#8b5cf6" : "#475569";
        
        // Add glow
        ctx.shadowBlur = state === "idle" ? 0 : 8;
        ctx.shadowColor = ctx.fillStyle;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      phase += 0.1;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [state, audioVolume]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 flex flex-col shadow-[0_0_15px_rgba(0,242,254,0.05)] h-40 items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
      <div className="text-cyan-400 font-mono text-[10px] uppercase mb-4 text-center tracking-widest relative z-10 flex items-center justify-center gap-2">
        {state === "speaking" && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
        {state === "listening" && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
        {state === "thinking" && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
        {state === "idle" && <span className="w-2 h-2 rounded-full bg-slate-500" />}
        {state === "speaking" ? "Acoustic Output" : state === "listening" ? "Audio Input Active" : state === "thinking" ? "Neural Processing" : "Neural Engine Idle"}
      </div>
      
      {state === "listening" && transcript && (
        <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 text-center text-emerald-400/80 font-mono text-sm px-4 truncate italic z-0 opacity-50">
           {transcript}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={300}
        height={60}
        className="w-full max-w-[300px] h-[60px] relative z-10"
      />
    </div>
  );
}
`;

fs.writeFileSync(file, code);
