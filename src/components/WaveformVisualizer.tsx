import React, { useEffect, useRef } from "react";
import { Brain, Activity } from "lucide-react";

interface Node3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  color: string;
  pulsePhase: number;
}

export function WaveformVisualizer({ 
  state, 
  audioVolume = 0,
  transcript = "",
  emotion = "calm"
}: { 
  state: "idle" | "listening" | "thinking" | "speaking" | "wake_listening",
  audioVolume?: number,
  transcript?: string,
  emotion?: "calm" | "joy" | "sorrow" | "anger" | "surprise"
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node3D[]>([]);

  // Initialize brain nodes once on mount
  if (nodesRef.current.length === 0) {
    const pts: Node3D[] = [];
    // Generate a clustered point cloud representing left & right brain hemispheres
    for (let i = 0; i < 46; i++) {
      const isLeft = i < 23;
      const sideSign = isLeft ? -1 : 1;
      
      // Generate spherical distribution, slightly squashed and shifted to hemispheres
      const theta = Math.random() * Math.PI;
      const phi = (Math.random() * Math.PI) + (isLeft ? 0 : Math.PI);
      
      const r = 24 + Math.random() * 12;
      const baseX = r * Math.sin(theta) * Math.cos(phi) * 1.2 + (sideSign * 7);
      const baseY = r * Math.sin(theta) * Math.sin(phi) * 0.85;
      const baseZ = r * Math.cos(theta) * 0.8;
      
      // Default base colors
      const color = isLeft ? "#00f2fe" : (i % 2 === 0 ? "#ec4899" : "#a855f7");
      
      pts.push({
        x: baseX,
        y: baseY,
        z: baseZ,
        baseX,
        baseY,
        baseZ,
        color,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
    nodesRef.current = pts;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2 - 10; // offset slightly upward to make room for waveform at bottom

      // Set speed and reactivity parameters based on assistant state
      let rotSpeedY = 0.008;
      let rotSpeedX = 0.004;
      let scaleMult = 1.0;
      let activityFactor = 1.0;
      let connectionThreshold = 38;

      if (state === "thinking") {
        rotSpeedY = 0.035; // rotate fast when thinking/processing
        rotSpeedX = 0.015;
        scaleMult = 1.0 + Math.sin(phase * 4) * 0.08; // pulse size
        activityFactor = 2.5;
        connectionThreshold = 42; // denser network
      } else if (state === "speaking") {
        rotSpeedY = 0.012;
        rotSpeedX = 0.006;
        const volAmp = Math.min(1.5, audioVolume * 15);
        scaleMult = 1.0 + volAmp * 0.15; // pulsate with spoken volume
        activityFactor = 1.8 + volAmp;
        connectionThreshold = 40;
      } else if (state === "listening" || state === "wake_listening") {
        rotSpeedY = 0.006;
        rotSpeedX = 0.003;
        const volAmp = Math.min(1.5, audioVolume * 15);
        scaleMult = 0.95 + volAmp * 0.12;
        activityFactor = 1.2 + volAmp * 1.5;
        connectionThreshold = 36;
      } else {
        // Idle
        rotSpeedY = 0.004;
        rotSpeedX = 0.002;
        scaleMult = 1.0 + Math.sin(phase * 0.5) * 0.03; // slow breath
        activityFactor = 0.6;
        connectionThreshold = 35;
      }

      // Apply modifiers based on current emotion
      let emotionSpeedMultiplier = 1.0;
      let emotionScaleMultiplier = 1.0;
      let emotionPulseSpeed = 1.0;
      let emotionSynapseColor = "rgba(6, 182, 212, "; // Default Teal
      let emotionSparkColor = "#06b6d4";

      if (emotion === "anger") {
        emotionSpeedMultiplier = 2.8;
        emotionScaleMultiplier = 1.05;
        emotionPulseSpeed = 2.5;
        emotionSynapseColor = "rgba(239, 68, 68, "; // Fiery Red
        emotionSparkColor = "#ef4444";
      } else if (emotion === "joy") {
        emotionSpeedMultiplier = 1.6;
        emotionScaleMultiplier = 1.1;
        emotionPulseSpeed = 1.8;
        emotionSynapseColor = "rgba(251, 191, 36, "; // Gold
        emotionSparkColor = "#fbbf24";
      } else if (emotion === "sorrow") {
        emotionSpeedMultiplier = 0.4;
        emotionScaleMultiplier = 0.9;
        emotionPulseSpeed = 0.4;
        emotionSynapseColor = "rgba(59, 130, 246, "; // Deep Blue
        emotionSparkColor = "#3b82f6";
      } else if (emotion === "surprise") {
        emotionSpeedMultiplier = 2.0;
        emotionScaleMultiplier = 1.15;
        emotionPulseSpeed = 2.0;
        emotionSynapseColor = "rgba(236, 72, 153, "; // Electric Pink
        emotionSparkColor = "#ec4899";
      } else {
        // Calm / Default
        emotionSpeedMultiplier = 1.0;
        emotionScaleMultiplier = 1.0;
        emotionPulseSpeed = 1.0;
        emotionSynapseColor = "rgba(6, 182, 212, "; // Teal/Cyan
        emotionSparkColor = "#06b6d4";
      }

      // Apply multipliers
      rotSpeedY *= emotionSpeedMultiplier;
      rotSpeedX *= emotionSpeedMultiplier;
      scaleMult *= emotionScaleMultiplier;

      // Rotate nodes around Y and X axes
      const cosY = Math.cos(phase * rotSpeedY * 5);
      const sinY = Math.sin(phase * rotSpeedY * 5);
      const cosX = Math.cos(phase * rotSpeedX * 5);
      const sinX = Math.sin(phase * rotSpeedX * 5);

      const projected: { sx: number; sy: number; sz: number; color: string; alpha: number }[] = [];

      nodesRef.current.forEach((node) => {
        // Core position with ambient noise/vibration
        let x = node.baseX;
        let y = node.baseY;
        let z = node.baseZ;

        if (state === "listening" || state === "wake_listening") {
          // high-frequency vibration representing raw audio capture
          const vib = Math.min(10, audioVolume * 50);
          x += (Math.random() - 0.5) * vib;
          y += (Math.random() - 0.5) * vib;
          z += (Math.random() - 0.5) * vib;
        }

        // Apply scale
        x *= scaleMult;
        y *= scaleMult;
        z *= scaleMult;

        // 3D rotation Y
        let rx = x * cosY - z * sinY;
        let rz = x * sinY + z * cosY;

        // 3D rotation X
        let ry = y * cosX - rz * sinX;
        rz = y * sinX + rz * cosX;

        // Projection math
        const focalLength = 160;
        const zOffset = 130;
        const distanceScale = focalLength / (rz + zOffset);
        const sx = rx * distanceScale + centerX;
        const sy = ry * distanceScale + centerY;

        // Node transparency based on depth (z)
        const depthAlpha = Math.max(0.15, Math.min(1, (rz + 40) / 80));

        // Resolve node color dynamically based on emotion
        let nodeColor = node.color;
        const isLeft = node.baseX < 0;
        if (emotion === "joy") {
          nodeColor = isLeft ? "#fbbf24" : "#f59e0b"; // Gold/Amber
        } else if (emotion === "sorrow") {
          nodeColor = isLeft ? "#3b82f6" : "#6366f1"; // Blue/Indigo
        } else if (emotion === "anger") {
          nodeColor = isLeft ? "#ef4444" : "#f97316"; // Crimson/Orange
        } else if (emotion === "surprise") {
          nodeColor = isLeft ? "#ec4899" : "#a855f7"; // Pink/Purple
        } else if (emotion === "calm") {
          nodeColor = isLeft ? "#00f2fe" : "#06b6d4"; // Cyan/Teal
        }

        projected.push({
          sx,
          sy,
          sz: rz,
          color: nodeColor,
          alpha: depthAlpha
        });
      });

      // Draw connection synapses between nearby nodes
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].sx - projected[j].sx;
          const dy = projected[i].sy - projected[j].sy;
          const dist2D = Math.sqrt(dx * dx + dy * dy);

          // Standard distance check in projected space
          if (dist2D < connectionThreshold * 1.5) {
            const distanceRatio = dist2D / (connectionThreshold * 1.5);
            const lineAlpha = (1 - distanceRatio) * 0.16 * activityFactor * projected[i].alpha;
            
            // Set synapse line style
            ctx.beginPath();
            ctx.lineWidth = 0.8;
            
            if (state === "thinking") {
              ctx.strokeStyle = `rgba(168, 85, 247, ${lineAlpha})`; // Purple processing
            } else if (state === "listening" || state === "wake_listening") {
              ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha})`; // Green audio signals
            } else if (state === "speaking") {
              ctx.strokeStyle = `${emotionSynapseColor}${lineAlpha})`; // Emotion Synced Speech lines
            } else {
              ctx.strokeStyle = `${emotionSynapseColor}${lineAlpha * 0.4})`; // Silent Idle colored lines
            }
            
            ctx.moveTo(projected[i].sx, projected[i].sy);
            ctx.lineTo(projected[j].sx, projected[j].sy);
            ctx.stroke();

            // Synaptic action potentials (glowing sparks flying along the connections)
            if (state === "thinking" || state === "speaking" || (state === "listening" && audioVolume > 0.05)) {
              if ((i + j) % 5 === 0) { // limit number of sparks
                const travelSpeed = state === "thinking" ? 0.08 * emotionPulseSpeed : 0.04 * emotionPulseSpeed;
                const progress = (phase * travelSpeed + (i * 0.1)) % 1;
                const sparkX = projected[i].sx + (projected[j].sx - projected[i].sx) * progress;
                const sparkY = projected[i].sy + (projected[j].sy - projected[i].sy) * progress;
                
                ctx.fillStyle = state === "thinking" ? "#c084fc" : state === "speaking" ? emotionSparkColor : "#34d399";
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, 1.2, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }

      // Draw the actual nodes (neurons)
      projected.forEach((node) => {
        ctx.beginPath();
        const baseSize = node.sz > 0 ? 3 : 1.8;
        const nodeSize = baseSize * (1 + (state === "thinking" ? 0.3 : 0));
        
        ctx.arc(node.sx, node.sy, nodeSize, 0, Math.PI * 2);

        // Styling based on state
        if (state === "idle") {
          ctx.fillStyle = node.color; // Subtle styled colors
        } else {
          ctx.fillStyle = node.color;
        }

        // Add visual glow to closer nodes
        if (node.sz < 10 && state !== "idle") {
          ctx.shadowBlur = 6;
          ctx.shadowColor = node.color;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // Draw bottom horizontal sound waveform
      ctx.beginPath();
      if (state === "speaking") {
        ctx.strokeStyle = emotion === "anger" ? "rgba(239, 68, 68, 0.65)" :
                          emotion === "joy" ? "rgba(251, 191, 36, 0.65)" :
                          emotion === "sorrow" ? "rgba(59, 130, 246, 0.65)" :
                          emotion === "surprise" ? "rgba(236, 72, 153, 0.65)" :
                          "rgba(0, 242, 254, 0.55)"; // Cyan spoken wave
        ctx.lineWidth = 2.0;
      } else if (state === "listening" || state === "wake_listening") {
        ctx.strokeStyle = "rgba(16, 185, 129, 0.55)"; // Emerald capture wave
        ctx.lineWidth = 1.5;
      } else if (state === "thinking") {
        ctx.strokeStyle = "rgba(168, 85, 247, 0.4)"; // Purple processing wave
        ctx.lineWidth = 1.0;
      } else {
        ctx.strokeStyle = emotion === "anger" ? "rgba(239, 68, 68, 0.2)" :
                          emotion === "joy" ? "rgba(251, 191, 36, 0.2)" :
                          emotion === "sorrow" ? "rgba(59, 130, 246, 0.15)" :
                          emotion === "surprise" ? "rgba(236, 72, 153, 0.2)" :
                          "rgba(71, 85, 105, 0.15)"; // Soft idle wave
        ctx.lineWidth = 0.8;
      }

      const waveY = height - 16;
      for (let x = 0; x < width; x += 4) {
        let amplitude = 2; // default idle vibration
        let freq = 0.04;

        if (state === "speaking") {
          const volAmp = Math.min(1.5, audioVolume * 15);
          amplitude = 6 + Math.sin(x * 0.08 + phase * 0.8) * 16 * volAmp;
          freq = 0.06;
        } else if (state === "listening" || state === "wake_listening") {
          const volAmp = Math.min(1.5, audioVolume * 15);
          amplitude = 3 + Math.abs(Math.sin(phase * 1.5)) * 25 * volAmp * Math.sin((x / width) * Math.PI);
          freq = 0.08;
        } else if (state === "thinking") {
          amplitude = 4 + Math.sin(phase * 2.5 + x * 0.1) * 3;
          freq = 0.05;
        }

        // Apply a multiplier to smooth down the wave edges to 0
        const edgeMultiplier = Math.sin((x / width) * Math.PI);
        const y = waveY + Math.sin(x * freq + phase * 0.5) * amplitude * edgeMultiplier;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.12;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [state, audioVolume, emotion]);

  return (
    <div id="ruvi-neural-waveform" className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-4 flex flex-col shadow-[0_0_20px_rgba(0,242,254,0.06)] min-h-[220px] items-center justify-center relative overflow-hidden transition-all duration-300">
      {/* Background radial gradient accent */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
        state === "thinking" ? "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06)_0%,transparent_70%)]" :
        (state === "listening" || state === "wake_listening") ? "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)]" :
        state === "speaking" ? (
          emotion === "anger" ? "bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)]" :
          emotion === "joy" ? "bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.08)_0%,transparent_70%)]" :
          emotion === "sorrow" ? "bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]" :
          emotion === "surprise" ? "bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.08)_0%,transparent_70%)]" :
          "bg-[radial-gradient(circle_at_center,rgba(0,242,254,0.08)_0%,transparent_70%)]"
        ) : (
          emotion === "anger" ? "bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.03)_0%,transparent_70%)]" :
          emotion === "joy" ? "bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.03)_0%,transparent_70%)]" :
          emotion === "sorrow" ? "bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.02)_0%,transparent_70%)]" :
          emotion === "surprise" ? "bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.03)_0%,transparent_70%)]" :
          "bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.02)_0%,transparent_70%)]"
        )
      }`} />
      
      {/* Status Indicators */}
      <div className="w-full flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2 relative z-10">
        <div className="flex items-center gap-1.5">
          <Brain className={`w-3.5 h-3.5 ${
            state === "thinking" ? "text-pink-400 animate-pulse" :
            state === "speaking" ? (
              emotion === "anger" ? "text-red-400 animate-bounce" :
              emotion === "joy" ? "text-amber-400 animate-bounce" :
              emotion === "sorrow" ? "text-blue-400 animate-bounce" :
              emotion === "surprise" ? "text-pink-400 animate-bounce" :
              "text-cyan-400 animate-bounce"
            ) :
            (state === "listening" || state === "wake_listening") ? "text-emerald-400 animate-spin" : "text-slate-500"
          }`} style={state === "listening" ? { animationDuration: "6s" } : undefined} />
          <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-slate-300">
            Ruvi Brain Activity
          </span>
        </div>

        {/* Emotion Synced HUD indicator */}
        <div className="flex items-center gap-1.5 bg-slate-950/50 border border-slate-800 rounded-full px-2 py-0.5 text-[8px] font-mono font-bold tracking-wider relative group">
          <span className={`w-1 h-1 rounded-full ${
            emotion === "anger" ? "bg-red-500 shadow-[0_0_4px_#ef4444]" :
            emotion === "joy" ? "bg-amber-400 shadow-[0_0_4px_#fbbf24]" :
            emotion === "sorrow" ? "bg-blue-400 shadow-[0_0_4px_#3b82f6]" :
            emotion === "surprise" ? "bg-pink-500 shadow-[0_0_4px_#ec4899]" :
            "bg-cyan-400 shadow-[0_0_4px_#06b6d4]"
          }`} />
          <span className="text-slate-500 uppercase">MOOD:</span>
          <span className={`uppercase ${
            emotion === "anger" ? "text-red-400" :
            emotion === "joy" ? "text-amber-400" :
            emotion === "sorrow" ? "text-blue-400" :
            emotion === "surprise" ? "text-pink-400" :
            "text-cyan-400"
          }`}>
            {emotion}
          </span>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={340}
        height={130}
        className="w-full max-w-[340px] h-[130px] relative z-10"
      />

      {/* Interactive transcript HUD bubble */}
      {(state === "listening" || state === "wake_listening") && transcript && (
        <div className="mt-2 w-full text-center text-emerald-300 font-mono text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/40 max-w-[320px] z-10 animate-fade-in leading-relaxed select-none break-words flex items-center justify-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
          <span>"{transcript}"</span>
        </div>
      )}
    </div>
  );
}
