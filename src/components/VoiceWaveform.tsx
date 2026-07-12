import React, { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  state: "idle" | "listening" | "thinking" | "speaking" | "wake_listening";
}

export default function VoiceWaveform({ state }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Core parameters based on state
      let speed = 0.08;
      let waveCount = 4;
      let color = "rgba(0, 242, 254, 0.4)";
      let primaryColor = "#00f2fe";
      let secondaryColor = "#ff0080";
      let amplitudeFactor = 1.0;

      if (state === "listening" || state === "wake_listening") {
        speed = state === "listening" ? 0.15 : 0.08;
        waveCount = state === "listening" ? 6 : 4;
        color = state === "listening" ? "rgba(16, 185, 129, 0.5)" : "rgba(16, 185, 129, 0.3)";
        primaryColor = "#10b981";
        amplitudeFactor = state === "listening" ? 1.5 : 0.7;
      } else if (state === "thinking") {
        speed = 0.05;
        waveCount = 3;
        color = "rgba(168, 85, 247, 0.5)";
        primaryColor = "#a855f7";
        secondaryColor = "#ec4899";
        amplitudeFactor = 0.6;
      } else if (state === "speaking") {
        speed = 0.22;
        waveCount = 7;
        color = "rgba(255, 0, 128, 0.5)";
        primaryColor = "#ff0080";
        secondaryColor = "#00f2fe";
        amplitudeFactor = 2.4;
      } else {
        // idle
        speed = 0.03;
        waveCount = 2;
        color = "rgba(14, 165, 233, 0.3)";
        primaryColor = "#38bdf8";
        amplitudeFactor = 0.3;
      }

      // Draw standard glowing orb behind the wave
      const grad = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, 60);
      if (state === "listening" || state === "wake_listening") {
        grad.addColorStop(0, state === "listening" ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.15)");
        grad.addColorStop(1, "rgba(16, 185, 129, 0)");
      } else if (state === "speaking") {
        grad.addColorStop(0, "rgba(255, 0, 128, 0.25)");
        grad.addColorStop(1, "rgba(255, 0, 128, 0)");
      } else if (state === "thinking") {
        grad.addColorStop(0, "rgba(168, 85, 247, 0.25)");
        grad.addColorStop(1, "rgba(168, 85, 247, 0)");
      } else {
        grad.addColorStop(0, "rgba(56, 189, 248, 0.15)");
        grad.addColorStop(1, "rgba(56, 189, 248, 0)");
      }
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // If thinking, draw a spinning futuristic concentric ring
      if (state === "thinking") {
        ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([15, 10]);
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 45, phase * 1.5, phase * 1.5 + Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(236, 72, 153, 0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 35, -phase * 2.0, -phase * 2.0 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }

      // Draw multi-layered sine waves
      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        ctx.lineWidth = i === 0 ? 3.0 : 1.0;
        
        // Blend colors
        const alpha = 1.0 - i / waveCount;
        ctx.strokeStyle = i === 0 ? primaryColor : color;
        
        // Add subtle neon glow
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = i === 0 ? 12 : 0;

        const amplitude = (15 + i * 8) * amplitudeFactor;
        const frequency = 0.015 + i * 0.005;

        for (let x = 0; x < w; x++) {
          // Fade wave edges so it looks clean inside the container
          const edgeFade = Math.sin((x / w) * Math.PI);
          const y =
            h / 2 +
            Math.sin(x * frequency + phase + i * (Math.PI / waveCount)) *
              amplitude *
              edgeFade;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Reset shadow
      ctx.shadowBlur = 0;

      // Update Phase
      phase += speed;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [state]);

  return (
    <div className="flex flex-col items-center justify-center py-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,242,254,0.05)_0%,transparent_70%)] pointer-events-none" />
      <canvas
        ref={canvasRef}
        width={320}
        height={130}
        className="w-full max-w-[320px] h-[130px] rounded-xl relative z-10"
      />
      
      {/* Dynamic State Banner */}
      <div className="mt-4 flex flex-col items-center gap-1.5 relative z-10">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full shadow-inner">
          <span className={`w-2 h-2 rounded-full ${
            state === "listening" ? "bg-cyan-400 animate-ping" :
            state === "speaking" ? "bg-pink-500 animate-bounce" :
            state === "thinking" ? "bg-purple-400 animate-spin" : "bg-sky-400"
          }`} />
          <span className="font-mono text-[10px] tracking-widest text-slate-300 uppercase">
            {state === "listening" ? "Ruvi listening..." :
             state === "speaking" ? "Ruvi speaking..." :
             state === "thinking" ? "Processing..." : "Ruvi Active"}
          </span>
        </div>
        
        {state === "idle" && (
          <span className="text-[10px] text-slate-500 font-mono tracking-wide">
            Say <b className="text-cyan-400">"Hey Ruvi"</b> or click the mic to wake me up!
          </span>
        )}
      </div>
    </div>
  );
}
