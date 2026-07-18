import React, { useEffect, useRef, useState } from "react";
import { 
  Radio, 
  Users, 
  Activity, 
  Eye, 
  Settings, 
  Zap, 
  Plus, 
  Trash2, 
  Heart, 
  TrendingUp, 
  Wifi, 
  Cpu, 
  ShieldAlert, 
  Volume2
} from "lucide-react";

interface RadarTarget {
  id: string;
  angle: number;
  distance: number;
  intensity: number;
  name: string;
  state: string;
  breath: number;
  heartRate: number;
  temp: number;
  device: string;
  snr: number;
}

export default function RadarSweep({ seamless = false }: { seamless?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const csiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sensingActive, setSensingActive] = useState(true);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>("user");
  const [radarMode, setRadarMode] = useState<"position" | "csi" | "doppler">("position");
  
  // Custom interactive settings
  const [gain, setGain] = useState<number>(75);
  const [frequency, setFrequency] = useState<string>("5.8 GHz");
  const [maxRange, setMaxRange] = useState<number>(5); // in meters
  
  // Radar ripple effects from clicks or impulse
  const [ripples, setRipples] = useState<{ x: number; y: number; r: number; maxR: number; alpha: number }[]>([]);
  
  const [targets, setTargets] = useState<RadarTarget[]>([
    { 
      id: "user", 
      angle: 45, 
      distance: 0.45, 
      intensity: 1.0, 
      name: "Subject #0 (User)", 
      state: "Stable (Sitting)", 
      breath: 16, 
      heartRate: 72, 
      temp: 36.6, 
      device: "Neural Sync Terminal", 
      snr: 42 
    },
    { 
      id: "node-2", 
      angle: 145, 
      distance: 0.72, 
      intensity: 0.85, 
      name: "Smart Node Alpha", 
      state: "Micro-vibrating", 
      breath: 0, 
      heartRate: 0, 
      temp: 21.4, 
      device: "IoT Speaker Echo", 
      snr: 28 
    },
    { 
      id: "node-3", 
      angle: 290, 
      distance: 0.82, 
      intensity: 0.68, 
      name: "Intruder Shadow", 
      state: "Waving (Gesture)", 
      breath: 22, 
      heartRate: 94, 
      temp: 37.1, 
      device: "Passive Reflection", 
      snr: 19 
    },
  ]);

  // Audio trigger utility
  const playPingSound = (freq: number = 880, type: OscillatorType = "sine", duration: number = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context block by browser security is safe
    }
  };

  // Emit dynamic microwave active RF impulse ping
  const emitRFImpulse = () => {
    if (!sensingActive) return;
    playPingSound(1200, "triangle", 0.4);
    
    // Trigger full radius expansion ripple from center
    setRipples((prev) => [
      ...prev,
      { x: 125, y: 125, r: 0, maxR: 120, alpha: 1.0 }
    ]);

    // Briefly randomize or pulse target breathing/heart metrics as "response resonance"
    setTargets((prev) => 
      prev.map((t) => ({
        ...t,
        breath: t.breath > 0 ? Math.min(30, Math.max(10, t.breath + Math.floor(Math.random() * 5 - 2))) : 0,
        heartRate: t.heartRate > 0 ? Math.min(130, Math.max(50, t.heartRate + Math.floor(Math.random() * 9 - 4))) : 0,
        intensity: Math.min(1.0, Math.max(0.4, t.intensity + 0.1))
      }))
    );
  };

  // Click on radar coordinate mapping
  const handleRadarClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sensingActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.min(cx, cy) - 10;

    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const relativeDistance = dist / maxRadius;

    // Check click distance limit
    if (relativeDistance > 1.05) return;

    // If clicking close to an existing target, select it instead of adding a new one
    let clickedExisting = false;
    for (const t of targets) {
      const targetRad = (t.angle * Math.PI) / 180;
      const tx = cx + Math.cos(targetRad) * (t.distance * maxRadius);
      const ty = cy + Math.sin(targetRad) * (t.distance * maxRadius);
      const distToTarget = Math.sqrt((mx - tx) ** 2 + (my - ty) ** 2);
      
      if (distToTarget < 15) {
        setSelectedTargetId(t.id);
        clickedExisting = true;
        playPingSound(600, "sine", 0.08);
        break;
      }
    }

    if (!clickedExisting) {
      // Calculate angle in degrees
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;

      // Add a gorgeous custom target at clicked location
      const newId = `custom-${Date.now()}`;
      const isBreathing = Math.random() > 0.3;
      const newTarget: RadarTarget = {
        id: newId,
        angle: angleDeg,
        distance: Math.min(0.95, Math.max(0.1, relativeDistance)),
        intensity: 0.8 + Math.random() * 0.2,
        name: `Node ${targets.length + 1} (Reflect)`,
        state: isBreathing ? "Sitting" : "Static Reflector",
        breath: isBreathing ? 14 + Math.floor(Math.random() * 10) : 0,
        heartRate: isBreathing ? 65 + Math.floor(Math.random() * 25) : 0,
        temp: isBreathing ? 36.2 + Math.random() * 1.0 : 19.5 + Math.random() * 3,
        device: "WiFi Scatterer Point",
        snr: 15 + Math.floor(Math.random() * 20)
      };

      setTargets((prev) => [...prev, newTarget]);
      setSelectedTargetId(newId);
      playPingSound(950, "sine", 0.12);

      // Trigger localized micro-ripple
      setRipples((prev) => [
        ...prev,
        { x: mx, y: my, r: 0, maxR: 35, alpha: 0.9 }
      ]);
    }
  };

  // Remove selected target
  const deleteTarget = (id: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    if (selectedTargetId === id) {
      setSelectedTargetId(null);
    }
    playPingSound(320, "sawtooth", 0.15);
  };

  // Change target state from panel
  const updateTargetState = (id: string, updates: Partial<RadarTarget>) => {
    setTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Core Simulation Loops
  useEffect(() => {
    if (!sensingActive) return;

    const canvas = canvasRef.current;
    const csiCanvas = csiCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let csiCtx: CanvasRenderingContext2D | null = null;
    if (csiCanvas) {
      csiCtx = csiCanvas.getContext("2d");
    }

    let animationId: number;
    let sweepAngle = 0;
    let frameCount = 0;
    const csiDataPoints: number[] = Array(80).fill(100);

    const render = () => {
      frameCount++;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(cx, cy) - 10;

      // ----------------- 1. PRIMARY RADAR SCOPE RENDERING -----------------
      // Clear with elegant high-tech phosphor decay trails
      ctx.fillStyle = "rgba(10, 16, 28, 0.14)";
      ctx.fillRect(0, 0, width, height);

      // Radar scopes: Concentric Range Rings with tech indicators
      ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
      ctx.lineWidth = 1;
      
      for (let r = maxRadius / 4; r <= maxRadius; r += maxRadius / 4) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Compass degree ticks or distances
        const distVal = (r / maxRadius) * maxRange;
        ctx.fillStyle = "rgba(6, 182, 212, 0.45)";
        ctx.font = "7px monospace";
        ctx.fillText(`${distVal.toFixed(1)}m`, cx + r - 12, cy - 3);
      }

      // Compass Degree Labels outer ring
      ctx.strokeStyle = "rgba(6, 182, 212, 0.04)";
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * (maxRadius - 4), cy + Math.sin(rad) * (maxRadius - 4));
        ctx.lineTo(cx + Math.cos(rad) * maxRadius, cy + Math.sin(rad) * maxRadius);
        ctx.stroke();
      }

      // Major Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.18)";
      ctx.stroke();

      // Dynamic Active ripples update & render
      setRipples((prevRipples) => {
        const active: typeof ripples = [];
        prevRipples.forEach((rip) => {
          const nextR = rip.r + 2.5;
          const nextAlpha = rip.alpha - 0.022;
          if (nextAlpha > 0 && nextR < rip.maxR) {
            active.push({ ...rip, r: nextR, alpha: nextAlpha });

            // Draw ripple ring
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, nextR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 242, 254, ${nextAlpha * 0.45})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
        return active;
      });

      // Sweep line calculation
      const sweepRad = (sweepAngle * Math.PI) / 180;
      const sx = cx + Math.cos(sweepRad) * maxRadius;
      const sy = cy + Math.sin(sweepRad) * maxRadius;

      // Draw sweep gradient cone
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, sweepRad - 0.22, sweepRad);
      ctx.closePath();
      ctx.fillStyle = "rgba(6, 182, 212, 0.05)";
      ctx.fill();

      // Sharp Phosphor sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.72)";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Render actual targets on Radar
      targets.forEach((target) => {
        const targetRad = (target.angle * Math.PI) / 180;
        const tx = cx + Math.cos(targetRad) * (target.distance * maxRadius);
        const ty = cy + Math.sin(targetRad) * (target.distance * maxRadius);

        // Sweep collision detection
        const angleDiff = Math.abs((sweepAngle % 360) - target.angle);
        const isPinged = angleDiff < 10 || angleDiff > 350;

        // Visual sizing pulse based on breathing rate
        const sizePulse = target.breath > 0 ? Math.sin(frameCount * 0.08 + target.angle) * 1.5 : 0;
        const radius = (selectedTargetId === target.id ? 6 : 4) + sizePulse;

        if (isPinged) {
          // Glow echo bubble
          ctx.beginPath();
          ctx.arc(tx, ty, radius + 7, 0, Math.PI * 2);
          ctx.fillStyle = target.id === "user" ? "rgba(6, 182, 212, 0.3)" : "rgba(236, 72, 153, 0.3)";
          ctx.fill();

          // Occasionally play sub-frequency synth tick on active sweeps
          if (frameCount % 60 === 0 && target.id === selectedTargetId) {
            playPingSound(700 + target.angle, "sine", 0.06);
          }
        }

        // Selected Target indicator bracket
        if (selectedTargetId === target.id) {
          ctx.beginPath();
          ctx.arc(tx, ty, radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = 0.85;
          ctx.stroke();
        }

        // Radar target core coordinate
        ctx.beginPath();
        ctx.arc(tx, ty, radius, 0, Math.PI * 2);
        ctx.fillStyle = isPinged 
          ? "#ffffff" 
          : target.id === "user" 
            ? "#06b6d4" 
            : "#ec4899";
        ctx.shadowBlur = isPinged ? 12 : 5;
        ctx.shadowColor = target.id === "user" ? "#06b6d4" : "#ec4899";
        ctx.fill();
        ctx.shadowBlur = 0;

        // Human ID Text
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "bold 8px monospace";
        ctx.fillText(target.name.split(" ")[0], tx + radius + 4, ty - 1);
        ctx.fillStyle = target.id === "user" ? "#22d3ee" : "#f472b6";
        ctx.font = "7px monospace";
        const valText = target.breath > 0 ? `${target.breath}bpm` : "REFLECT";
        ctx.fillText(valText, tx + radius + 4, ty + 7);
      });

      // Update sweep angle speed
      sweepAngle = (sweepAngle + 1.4) % 360;

      // Micro-fluctuations of targets representing real breathing/movement
      if (Math.random() < 0.04) {
        setTargets((prev) =>
          prev.map((t) => {
            // Passive wander logic
            const angleChange = (Math.random() * 3 - 1.5);
            const distChange = (Math.random() * 0.015 - 0.0075);
            const newAngle = (t.angle + angleChange + 360) % 360;
            const newDistance = Math.max(0.15, Math.min(0.92, t.distance + distChange));

            // Dynamic breath bounce
            const breathFluct = t.breath > 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            const newBreath = t.breath > 0 ? Math.max(12, Math.min(26, t.breath + breathFluct)) : 0;

            const hrFluct = t.heartRate > 0 ? (Math.random() > 0.5 ? 2 : -2) : 0;
            const newHR = t.heartRate > 0 ? Math.max(58, Math.min(105, t.heartRate + hrFluct)) : 0;

            return {
              ...t,
              angle: newAngle,
              distance: newDistance,
              breath: newBreath,
              heartRate: newHR,
              snr: Math.max(10, Math.min(50, t.snr + (Math.random() > 0.5 ? 1 : -1)))
            };
          })
        );
      }

      // ----------------- 2. DYNAMIC CSI WAVEFORM (Wi-Fi Channel State) -----------------
      if (csiCtx && csiCanvas) {
        const cw = csiCanvas.width;
        const ch = csiCanvas.height;

        csiCtx.fillStyle = "rgba(10, 16, 28, 0.25)";
        csiCtx.fillRect(0, 0, cw, ch);

        // Grid lines
        csiCtx.strokeStyle = "rgba(6, 182, 212, 0.08)";
        csiCtx.lineWidth = 0.5;
        for (let i = 20; i < ch; i += 20) {
          csiCtx.beginPath();
          csiCtx.moveTo(0, i);
          csiCtx.lineTo(cw, i);
          csiCtx.stroke();
        }

        // Calculate dynamic wave amplitude
        let baseFreq = frameCount * 0.05;
        let csiValue = ch / 2;

        // Sum sine waves representing each target's physical displacement
        targets.forEach((t) => {
          if (t.breath > 0) {
            csiValue += Math.sin(frameCount * (t.breath * 0.005) + t.angle) * 12 * t.intensity;
          } else {
            csiValue += Math.sin(frameCount * 0.01) * 3;
          }
        });

        // Add a bit of natural microwave noise
        csiValue += (Math.random() - 0.5) * 4.5 * (100 - gain) / 40;

        csiDataPoints.shift();
        csiDataPoints.push(csiValue);

        // Draw CSI Amplitude lines
        csiCtx.beginPath();
        for (let i = 0; i < csiDataPoints.length; i++) {
          const x = (i / (csiDataPoints.length - 1)) * cw;
          const y = csiDataPoints[i];
          if (i === 0) {
            csiCtx.moveTo(x, y);
          } else {
            csiCtx.lineTo(x, y);
          }
        }

        csiCtx.strokeStyle = radarMode === "csi" ? "rgba(6, 182, 212, 0.85)" : "rgba(236, 72, 153, 0.65)";
        csiCtx.lineWidth = 1.3;
        csiCtx.shadowBlur = 4;
        csiCtx.shadowColor = "#06b6d4";
        csiCtx.stroke();
        csiCtx.shadowBlur = 0;

        // Draw real-time sub-metrics in sub-canvas
        csiCtx.fillStyle = "rgba(6, 182, 212, 0.85)";
        csiCtx.font = "8px monospace";
        csiCtx.fillText(`BANDWIDTH: ${frequency} | SNR PROX: ${gain}dB`, 5, 12);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [sensingActive, targets, radarMode, gain, frequency, maxRange, selectedTargetId]);

  const selectedTarget = targets.find((t) => t.id === selectedTargetId);

  return (
    <div id="ruview_wifi_radar" className={seamless ? "flex flex-col transition-all duration-300 w-full relative" : "bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-4 flex flex-col shadow-[0_0_15px_rgba(0,242,254,0.1)] relative overflow-hidden transition-all duration-300"}>
      {!seamless && <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />}
      
      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-4 border-b border-cyan-500/15 pb-2.5">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-sans font-medium text-xs tracking-widest text-cyan-400 uppercase">
            RuView Wi-Fi Radar AI
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => emitRFImpulse()}
            disabled={!sensingActive}
            className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono text-pink-400 border border-pink-500/20 hover:border-pink-500/50 rounded hover:bg-pink-500/10 transition-all disabled:opacity-40"
            title="Emit High-Intensity RF Micro-wave Signal Ping"
          >
            <Zap className="w-3 h-3 animate-bounce" />
            <span>EMIT PULSE</span>
          </button>

          <button
            onClick={() => {
              setSensingActive(!sensingActive);
              playPingSound(sensingActive ? 400 : 800, "sine", 0.2);
            }}
            className={`px-2 py-0.5 text-[10px] font-mono tracking-wider rounded border transition-all ${
              sensingActive
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
            }`}
          >
            {sensingActive ? "● ACTIVE SENSING" : "○ MUTED"}
          </button>
        </div>
      </div>

      {/* Main Layout: Split into circular scope & live controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column: Interactive Canvas Radar */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-64 h-64 bg-slate-950/90 rounded-full border border-cyan-500/20 flex items-center justify-center p-1 overflow-hidden shadow-[inset_0_0_20px_rgba(6,182,212,0.15)] group">
            
            {/* Interactive Canvas */}
            <canvas
              ref={canvasRef}
              width={250}
              height={250}
              onClick={handleRadarClick}
              className="rounded-full cursor-crosshair transition-all"
              title="Click on radar area to manually place/inject dynamic neural nodes"
            />
            
            {/* Overlay indicators on hover */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none text-[8px] font-mono text-cyan-500/60 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
              CLICK CANVAS TO INJECT PRESENCE
            </div>

            {!sensingActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-cyan-400 font-mono text-xs z-10">
                <ShieldAlert className="w-8 h-8 text-cyan-500 animate-pulse mb-2" />
                <span className="font-semibold tracking-wider">MICROWAVE DEACTIVATED</span>
                <span className="text-[9px] text-slate-500 mt-1 max-w-[180px] text-center">Toggle 'ACTIVE SENSING' to initialize Passive RF radar.</span>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 mt-3.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800 w-full justify-around">
            <button
              onClick={() => { setRadarMode("position"); playPingSound(500, "sine", 0.05); }}
              className={`flex-1 text-center py-1 text-[9px] font-mono rounded-lg transition-all ${
                radarMode === "position" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              POSITION MAP
            </button>
            <button
              onClick={() => { setRadarMode("csi"); playPingSound(520, "sine", 0.05); }}
              className={`flex-1 text-center py-1 text-[9px] font-mono rounded-lg transition-all ${
                radarMode === "csi" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              CSI INTERFERENCE
            </button>
          </div>
        </div>

        {/* Right Column: Real-time Telemetry Control Deck */}
        <div className="lg:col-span-6 space-y-3.5 w-full">
          
          {/* Selected Target Micro-biosensing Matrix Inspector */}
          {selectedTarget ? (
            <div className="bg-slate-950/60 p-3 rounded-xl border border-cyan-500/20 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  Target Telemetry File
                </span>
                <button
                  onClick={() => deleteTarget(selectedTarget.id)}
                  className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-all"
                  title="Remove injected target reflection"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Real-time editable parameters for custom testing */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-slate-400">Target Label:</span>
                  <input
                    type="text"
                    value={selectedTarget.name}
                    onChange={(e) => updateTargetState(selectedTarget.id, { name: e.target.value })}
                    className="bg-slate-900 border border-cyan-500/10 rounded px-1.5 py-0.5 text-white text-[10px] font-mono focus:border-cyan-500/40 outline-none w-32 text-right"
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-slate-400">Activity Posture:</span>
                  <select
                    value={selectedTarget.state}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isRef = val === "Static Reflector" || val === "Micro-vibrating";
                      updateTargetState(selectedTarget.id, { 
                        state: val,
                        breath: isRef ? 0 : 16,
                        heartRate: isRef ? 0 : 72
                      });
                      playPingSound(450, "sine", 0.08);
                    }}
                    className="bg-slate-900 border border-cyan-500/10 rounded px-1.5 py-0.5 text-white text-[10px] font-mono focus:border-cyan-500/40 outline-none"
                  >
                    <option value="Stable (Sitting)">Stable (Sitting)</option>
                    <option value="Walking">Walking</option>
                    <option value="Waving (Gesture)">Waving (Gesture)</option>
                    <option value="Sleeping / Low Vital">Sleeping / Low Vital</option>
                    <option value="FALL DETECTED!">FALL DETECTED!</option>
                    <option value="Micro-vibrating">Micro-vibrating (Object)</option>
                    <option value="Static Reflector">Static Reflector</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-cyan-500/5">
                  <div className="bg-slate-900/60 p-1.5 rounded flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] text-cyan-300 font-mono">
                      <Heart className="w-3 h-3 text-red-500" />
                      <span>HEART RATE</span>
                    </div>
                    <span className="text-[11px] font-mono text-white font-bold">
                      {selectedTarget.heartRate > 0 ? `${selectedTarget.heartRate} bpm` : "0 (N/A)"}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-1.5 rounded flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] text-cyan-300 font-mono">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>BREATHING</span>
                    </div>
                    <span className="text-[11px] font-mono text-white font-bold">
                      {selectedTarget.breath > 0 ? `${selectedTarget.breath} bpm` : "0 (N/A)"}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-1.5 rounded flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono">TEMPERATURE</span>
                    <span className="text-[11px] font-mono text-white font-bold">
                      {selectedTarget.temp.toFixed(1)} °C
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-1.5 rounded flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono">SIGNAL SNR</span>
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">
                      +{selectedTarget.snr} dB
                    </span>
                  </div>
                </div>

                {/* Simulated Device reflection */}
                <div className="text-[9px] font-mono text-slate-500 mt-1.5 flex justify-between">
                  <span>RF SIGNATURE: {selectedTarget.device}</span>
                  <span>POLARIZATION: HH+VV</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/40 p-5 rounded-xl border border-dashed border-slate-800 text-center flex flex-col items-center justify-center h-[120px]">
              <Users className="w-6 h-6 text-slate-600 mb-1.5" />
              <span className="text-[10px] font-mono text-slate-500">NO TARGET SELECTED</span>
              <span className="text-[9px] text-slate-600 max-w-[180px] mt-1">
                Click on any radar echo point in the scope to inspect biological vitals.
              </span>
            </div>
          )}

          {/* Dynamic Wi-Fi Channel State (CSI) Amplitude Oscilloscope */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-mono text-pink-400 uppercase tracking-widest flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" />
                WiFi Channel State (CSI) Spectrum
              </span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded animate-pulse">
                REAL-TIME REFLECTION
              </span>
            </div>
            
            <canvas
              ref={csiCanvasRef}
              width={260}
              height={60}
              className="w-full bg-slate-950/90 rounded border border-cyan-500/10"
            />
          </div>

          {/* SENSING HARDWARE ADVANCED CONFIG */}
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 space-y-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              RF Hardware Calibration
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono text-slate-400 flex justify-between">
                  <span>RF GAIN:</span>
                  <span className="text-cyan-400">{gain} dB</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={gain}
                  onChange={(e) => {
                    const nextVal = Number(e.target.value);
                    setGain(nextVal);
                    if (nextVal % 5 === 0) playPingSound(300 + nextVal * 3, "sine", 0.04);
                  }}
                  className="accent-cyan-500 cursor-pointer h-1 rounded"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono text-slate-400 flex justify-between">
                  <span>BANDWIDTH:</span>
                  <span className="text-pink-400">{frequency}</span>
                </label>
                <select
                  value={frequency}
                  onChange={(e) => {
                    setFrequency(e.target.value);
                    playPingSound(500, "triangle", 0.1);
                  }}
                  className="bg-slate-900 border border-slate-800 text-[9px] font-mono rounded px-1 py-0.5 text-white focus:outline-none"
                >
                  <option value="2.4 GHz">2.4 GHz (ISM)</option>
                  <option value="5.8 GHz">5.8 GHz (High Perf)</option>
                  <option value="60 GHz">60 GHz (WiGig Fine)</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
