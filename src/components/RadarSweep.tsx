import React, { useEffect, useRef, useState } from "react";
import { Radio, Users, Activity, Eye } from "lucide-react";

interface RadarTarget {
  id: string;
  angle: number;
  distance: number;
  intensity: number;
  name: string;
  state: string;
  breath: number;
}

export default function RadarSweep() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sensingActive, setSensingActive] = useState(true);
  const [targets, setTargets] = useState<RadarTarget[]>([
    { id: "1", angle: 45, distance: 0.6, intensity: 1.0, name: "Person #1 (User)", state: "Sitting", breath: 15 },
    { id: "2", angle: 160, distance: 0.8, intensity: 0.7, name: "Person #2 (Dynamic)", state: "Moving", breath: 21 },
  ]);

  useEffect(() => {
    if (!sensingActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let sweepAngle = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(cx, cy) - 10;

      // Clear with slight alpha to create motion trails
      ctx.fillStyle = "rgba(10, 15, 30, 0.15)";
      ctx.fillRect(0, 0, width, height);

      // concentric grid circles
      ctx.strokeStyle = "rgba(0, 242, 254, 0.15)";
      ctx.lineWidth = 1;
      for (let r = maxRadius / 4; r <= maxRadius; r += maxRadius / 4) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // grid labels
        ctx.fillStyle = "rgba(0, 242, 254, 0.4)";
        ctx.font = "8px monospace";
        ctx.fillText(`${(r / maxRadius * 5).toFixed(1)}m`, cx + r - 15, cy - 4);
      }

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.stroke();

      // Sweep line
      const sweepRad = (sweepAngle * Math.PI) / 180;
      const sx = cx + Math.cos(sweepRad) * maxRadius;
      const sy = cy + Math.sin(sweepRad) * maxRadius;

      // Draw sweep gradient
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      grad.addColorStop(0, "rgba(0, 242, 254, 0.1)");
      grad.addColorStop(1, "rgba(0, 242, 254, 0.0)");

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, sweepRad - 0.2, sweepRad);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 242, 254, 0.08)";
      ctx.fill();

      // Bright sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = "rgba(0, 242, 254, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw targets
      targets.forEach((target) => {
        const targetRad = (target.angle * Math.PI) / 180;
        const tx = cx + Math.cos(targetRad) * (target.distance * maxRadius);
        const ty = cy + Math.sin(targetRad) * (target.distance * maxRadius);

        // Check if sweep line is close to target to ping it
        const angleDiff = Math.abs((sweepAngle % 360) - target.angle);
        const isPinged = angleDiff < 8 || angleDiff > 352;

        if (isPinged) {
          // Glow effect
          ctx.beginPath();
          ctx.arc(tx, ty, 8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 0, 128, 0.4)";
          ctx.fill();
        }

        // Target dot
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fillStyle = isPinged ? "#ff0080" : "rgba(0, 242, 254, 0.7)";
        ctx.fill();

        // Target name text
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = "9px monospace";
        ctx.fillText(target.name, tx + 8, ty - 2);
        ctx.fillStyle = "rgba(0, 242, 254, 0.6)";
        ctx.fillText(`${target.state} (${target.breath}bpm)`, tx + 8, ty + 8);
      });

      // Update sweep angle
      sweepAngle = (sweepAngle + 1.2) % 360;

      // Random movement simulation for targets
      if (Math.random() < 0.02) {
        setTargets((prev) =>
          prev.map((t) => {
            if (t.id === "2") {
              const newAngle = (t.angle + (Math.random() * 6 - 3) + 360) % 360;
              const newDist = Math.max(0.3, Math.min(0.9, t.distance + (Math.random() * 0.04 - 0.02)));
              return { ...t, angle: newAngle, distance: newDist };
            }
            return t;
          })
        );
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [sensingActive, targets]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-4 flex flex-col items-center shadow-[0_0_15px_rgba(0,242,254,0.1)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
      
      <div className="w-full flex items-center justify-between mb-4 border-b border-cyan-500/10 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-sans font-medium text-sm tracking-widest text-cyan-400 uppercase">
            RuView WiFi Radar
          </span>
        </div>
        <button
          onClick={() => setSensingActive(!sensingActive)}
          className={`px-2 py-1 text-[10px] font-mono tracking-wider rounded border ${
            sensingActive
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          {sensingActive ? "● ACTIVE" : "○ OFFLINE"}
        </button>
      </div>

      <div className="relative w-64 h-64 bg-black/40 rounded-full border border-cyan-500/20 flex items-center justify-center p-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={250}
          height={250}
          className="rounded-full bg-slate-950/80"
        />
        
        {!sensingActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-cyan-400 font-mono text-xs">
            <span className="animate-pulse">SENSING DEACTIVATED</span>
            <span className="text-[10px] text-slate-500 mt-1">CLICK ACTIVE TO BOOT WiFi RADAR</span>
          </div>
        )}
      </div>

      {/* Live Telemetry Info */}
      <div className="w-full mt-4 space-y-2 font-mono text-[11px] text-slate-300">
        <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-cyan-500/5">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Users className="w-3.5 h-3.5" />
            <span>Target Presence:</span>
          </div>
          <span className="text-white font-semibold">{sensingActive ? "2 Detected" : "0 (Muted)"}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950/40 p-2 rounded border border-cyan-500/5 flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 uppercase">WiFi Sensing Type</span>
            <span className="text-cyan-300">Passive RF Ripple</span>
          </div>
          <div className="bg-slate-950/40 p-2 rounded border border-cyan-500/5 flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 uppercase">Gesture Link</span>
            <span className="text-pink-400">Active (Camera/IR)</span>
          </div>
        </div>

        {sensingActive && (
          <div className="space-y-1 bg-slate-950/50 p-2 rounded border border-cyan-500/10">
            <div className="flex justify-between text-cyan-300 text-[10px]">
              <span>[Node-1] Breathing rate:</span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> 15 bpm (Stable)
              </span>
            </div>
            <div className="flex justify-between text-cyan-300 text-[10px]">
              <span>[Node-2] Pose Estimation:</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-pink-400 animate-pulse" /> Walking (Speed: 0.4 m/s)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
