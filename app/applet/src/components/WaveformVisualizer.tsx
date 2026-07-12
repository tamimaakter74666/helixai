import React, { useEffect, useRef } from "react";

export function WaveformVisualizer({ state }: { state: "idle" | "listening" | "thinking" | "speaking" }) {
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

      for (let i = 0; i < bars; i++) {
        let barHeight = 4; // idle minimum height

        if (state === "speaking") {
          // Dynamic visualizer simulating speech volume
          const frequency = 0.2;
          const amplitude = Math.sin(phase + i * frequency) * Math.cos(phase * 0.8 - i * 0.1);
          // Add some randomness for the speech effect
          const randomFactor = Math.random() * 0.5 + 0.5;
          barHeight = 10 + Math.abs(amplitude) * 30 * randomFactor;
        } else if (state === "listening") {
          // Smooth pulsating wave
          const amplitude = Math.sin(phase + i * 0.15);
          barHeight = 15 + Math.abs(amplitude) * 15;
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
  }, [state]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 flex flex-col shadow-[0_0_15px_rgba(0,242,254,0.05)] h-32 items-center justify-center">
      <div className="text-cyan-400 font-mono text-[10px] uppercase mb-2 text-center tracking-widest">
        {state === "speaking" ? "Acoustic Output" : state === "listening" ? "Audio Input Active" : state === "thinking" ? "Neural Processing" : "Neural Engine Idle"}
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={60}
        className="w-full max-w-[300px] h-[60px]"
      />
    </div>
  );
}
