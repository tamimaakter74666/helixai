import React, { useEffect, useRef, useState } from "react";
import { Brain, Activity, Layers, Cpu } from "lucide-react";

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
  emotion = "calm",
  calibrationStatus,
  onCalibrate
}: { 
  state: "idle" | "listening" | "thinking" | "speaking" | "wake_listening",
  audioVolume?: number,
  transcript?: string,
  emotion?: "calm" | "joy" | "sorrow" | "anger" | "surprise",
  calibrationStatus?: { isCalibrating: boolean; isCalibrated: boolean; noiseFloorDB: number },
  onCalibrate?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node3D[]>([]);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);

  // Responsive canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 340, height: 140 });

  // Core telemetries state
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);

  // Resize observer to dynamically adapt canvas dimensions to the container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Keep within reasonable boundaries, height follows width ratio nicely
        const w = Math.max(280, Math.min(width, 1000));
        const h = 300; // Increased height for larger, more impressive visualization
        setDimensions({ width: w, height: h });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Background state polling (respecting useEffect primitive guideline - empty array)
  useEffect(() => {
    let active = true;
    const fetchTelemetry = async () => {
      try {
        const [knowRes, queueRes] = await Promise.all([
          fetch("/api/evolution/knowledge"),
          fetch("/api/evolution/queue")
        ]);
        if (!active) return;
        
        if (knowRes.ok) {
          const knowData = await knowRes.json();
          setKnowledge(Array.isArray(knowData) ? knowData : []);
        }
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          setQueue(Array.isArray(queueData) ? queueData : []);
        }
      } catch (err) {
        console.warn("[Brain Core Telemetry] Polling interrupted:", err);
      }
    };

    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 3500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Initialize background brain hemisphere nodes once on mount
  if (nodesRef.current.length === 0) {
    const pts: Node3D[] = [];
    for (let i = 0; i < 64; i++) {
      const isLeft = i < 32;
      const sideSign = isLeft ? -1 : 1;
      
      const theta = Math.random() * Math.PI;
      const phi = (Math.random() * Math.PI) + (isLeft ? 0 : Math.PI);
      
      const r = 45 + Math.random() * 20;
      const baseX = r * Math.sin(theta) * Math.cos(phi) * 1.35 + (sideSign * 48);
      const baseY = r * Math.sin(theta) * Math.sin(phi) * 0.95;
      const baseZ = r * Math.cos(theta) * 0.9;
      
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

  // Use refs to store rapidly updating state & props. This prevents constant tearing-down
  // of the high-frequency animation loop, keeping the brain rotation butter-smooth and preventing freezing!
  const stateRef = useRef(state);
  const audioVolumeRef = useRef(audioVolume);
  const emotionRef = useRef(emotion);
  const knowledgeRef = useRef(knowledge);
  const queueRef = useRef(queue);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { audioVolumeRef.current = audioVolume; }, [audioVolume]);
  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { knowledgeRef.current = knowledge; }, [knowledge]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseRef.current = { x, y };
  };

  const handleMouseLeave = () => {
    mouseRef.current = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const draw = () => {
      // Bind local variables from the current ref states at the beginning of each frame.
      // This allows the exact same visualization code below to run uninterrupted.
      const state = stateRef.current;
      const audioVolume = audioVolumeRef.current;
      const emotion = emotionRef.current;
      const knowledge = knowledgeRef.current;
      const queue = queueRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2 - 10;

      let rotSpeedY = 0.0012;
      let rotSpeedX = 0.0006;
      let scaleMult = 1.0;
      let activityFactor = 1.0;
      let connectionThreshold = 48; // Higher because points are spread out

      if (state === "thinking") {
        rotSpeedY = 0.0035;
        rotSpeedX = 0.0018;
        scaleMult = 1.0 + Math.sin(phase * 0.15) * 0.012; // Smooth breathing, not rapid bounce
        activityFactor = 2.0;
        connectionThreshold = 52;
      } else if (state === "speaking") {
        rotSpeedY = 0.0024;
        rotSpeedX = 0.0012;
        const volAmp = Math.min(0.8, audioVolume * 3); // Smooth down volume impact
        scaleMult = 1.0 + volAmp * 0.02; // Very gentle speaking expansion
        activityFactor = 1.5 + volAmp;
        connectionThreshold = 50;
      } else if (state === "listening" || state === "wake_listening") {
        rotSpeedY = 0.0018;
        rotSpeedX = 0.0009;
        const volAmp = Math.min(0.8, audioVolume * 3);
        scaleMult = 0.99 + volAmp * 0.015;
        activityFactor = 1.1 + volAmp * 0.8;
        connectionThreshold = 46;
      } else {
        rotSpeedY = 0.001;
        rotSpeedX = 0.0005;
        scaleMult = 1.0 + Math.sin(phase * 0.05) * 0.006; // Calm natural breathing
        activityFactor = 0.6;
        connectionThreshold = 45;
      }

      // Emotional settings
      let emotionSpeedMultiplier = 1.0;
      let emotionScaleMultiplier = 1.0;
      let emotionPulseSpeed = 1.0;
      let emotionSynapseColor = "rgba(6, 182, 212, ";
      let emotionSparkColor = "#06b6d4";

      if (emotion === "anger") {
        emotionSpeedMultiplier = 1.35;
        emotionScaleMultiplier = 1.01;
        emotionPulseSpeed = 1.35;
        emotionSynapseColor = "rgba(239, 68, 68, ";
        emotionSparkColor = "#ef4444";
      } else if (emotion === "joy") {
        emotionSpeedMultiplier = 1.15;
        emotionScaleMultiplier = 1.015;
        emotionPulseSpeed = 1.15;
        emotionSynapseColor = "rgba(251, 191, 36, ";
        emotionSparkColor = "#fbbf24";
      } else if (emotion === "sorrow") {
        emotionSpeedMultiplier = 0.6;
        emotionScaleMultiplier = 0.98;
        emotionPulseSpeed = 0.6;
        emotionSynapseColor = "rgba(59, 130, 246, ";
        emotionSparkColor = "#3b82f6";
      } else if (emotion === "surprise") {
        emotionSpeedMultiplier = 1.25;
        emotionScaleMultiplier = 1.015;
        emotionPulseSpeed = 1.25;
        emotionSynapseColor = "rgba(236, 72, 153, ";
        emotionSparkColor = "#ec4899";
      } else {
        emotionSpeedMultiplier = 1.0;
        emotionScaleMultiplier = 1.0;
        emotionPulseSpeed = 1.0;
        emotionSynapseColor = "rgba(6, 182, 212, ";
        emotionSparkColor = "#06b6d4";
      }

      rotSpeedY *= emotionSpeedMultiplier;
      rotSpeedX *= emotionSpeedMultiplier;
      scaleMult *= emotionScaleMultiplier;

      // Removed fast * 5 multiplier to ensure comfortable, smooth cinematic rotations
      const cosY = Math.cos(phase * rotSpeedY);
      const sinY = Math.sin(phase * rotSpeedY);
      const cosX = Math.cos(phase * rotSpeedX);
      const sinX = Math.sin(phase * rotSpeedX);

      // Build Combined 3D Node Cloud (Base + Grown + Active Tasks)
      const allNodes: any[] = [];

      // 1. Core Background Hemispheres
      nodesRef.current.forEach((n, idx) => {
        allNodes.push({
          id: `base_${idx}`,
          x: n.baseX,
          y: n.baseY,
          z: n.baseZ,
          color: n.color,
          isBase: true,
          isLeft: idx < 32,
          label: ""
        });
      });

      // Add major Left Core and Right Core centers for visualization
      allNodes.push({
        id: "core_left_center",
        x: -48,
        y: 0,
        z: 0,
        color: "#00f2fe",
        isCoreCenter: true,
        isLeft: true,
        label: "COGNITIVE HUB A"
      });

      allNodes.push({
        id: "core_right_center",
        x: 48,
        y: 0,
        z: 0,
        color: "#ec4899",
        isCoreCenter: true,
        isLeft: false,
        label: "EVOLUTION HUB B"
      });

      // 2. Real-time Knowledge Nodes (Grown Nodes)
      const maxKNodes = 12;
      const kItems = Array.isArray(knowledge) ? knowledge.slice(0, maxKNodes) : [];
      kItems.forEach((item, index) => {
        const seed = item.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        
        // Circular orbital shell mapping
        const theta = ((seed % 100) / 100) * Math.PI;
        const phi = (index / kItems.length) * Math.PI * 2 + (phase * 0.01);
        
        const r = 44 + (seed % 10);
        const baseX = r * Math.sin(theta) * Math.cos(phi);
        const baseY = r * Math.sin(theta) * Math.sin(phi);
        const baseZ = r * Math.cos(theta) * 0.9;
        
        let color = "#00f2fe";
        if (item.channel === "RFC") color = "#ec4899";
        else if (item.channel === "CVE") color = "#ef4444";
        else if (item.channel === "OWASP") color = "#fbbf24";
        else if (item.channel === "MDN") color = "#00f2fe";
        else color = "#10b981";

        allNodes.push({
          id: item.id,
          x: baseX,
          y: baseY,
          z: baseZ,
          color,
          isKnowledge: true,
          label: item.topic,
          channel: item.channel || "Web",
          confidenceScore: item.confidenceScore || 80,
          whyUseful: item.whyUseful,
          evidence: item.evidence,
          obsoleteStatus: item.obsoleteStatus || "Active"
        });
      });

      // 3. FIFO Background Processing Queue Nodes
      const qItems = Array.isArray(queue) ? queue : [];
      let ingressCenterNode: any = null;
      if (qItems.length > 0) {
        // Queue central node
        ingressCenterNode = {
          id: "queue_ingress_center",
          x: 0,
          y: -20,
          z: 15,
          color: "#06b6d4",
          isQueueCenter: true,
          label: "INGRESS CORE"
        };
        allNodes.push(ingressCenterNode);

        qItems.forEach((task, index) => {
          const phi = (index / qItems.length) * Math.PI * 2 + (phase * 0.04);
          const r = 62;
          const baseX = r * Math.cos(phi);
          const baseY = r * Math.sin(phi);
          const baseZ = -20;

          allNodes.push({
            id: `queue_${index}`,
            x: baseX,
            y: baseY,
            z: baseZ,
            color: index === 0 ? "#f43f5e" : "#e2e8f0",
            isQueueTask: true,
            label: task.topic,
            channel: task.channel,
            isProcessing: index === 0,
            taskItem: task
          });
        });
      }

      // Rotate and Project all nodes
      const projected: any[] = [];
      allNodes.forEach((node) => {
        let x = node.x;
        let y = node.y;
        let z = node.z;

        if ((state === "listening" || state === "wake_listening") && node.isBase) {
          const vib = Math.min(10, audioVolume * 50);
          x += (Math.random() - 0.5) * vib;
          y += (Math.random() - 0.5) * vib;
          z += (Math.random() - 0.5) * vib;
        }

        x *= scaleMult;
        y *= scaleMult;
        z *= scaleMult;

        const rx = x * cosY - z * sinY;
        let rz = x * sinY + z * cosY;

        const ry = y * cosX - rz * sinX;
        rz = y * sinX + rz * cosX;

        const focalLength = 160;
        const zOffset = 130;
        const distanceScale = focalLength / (rz + zOffset);
        const sx = rx * distanceScale + centerX;
        const sy = ry * distanceScale + centerY;

        const depthAlpha = Math.max(0.12, Math.min(1, (rz + 40) / 80));

        projected.push({
          ...node,
          sx,
          sy,
          sz: rz,
          distanceScale,
          alpha: depthAlpha
        });
      });

      // --- Generate and Render 3D Neural Web Streams ("web gulo kotha theke asbe jasdsche") ---
      const numStreams = 5;
      const streamPoints2D: any[][] = [];
      const streamColors: string[] = [
        "rgba(6, 182, 212, ",  // Cyan
        "rgba(236, 72, 153, ", // Pink
        "rgba(168, 85, 247, ", // Purple
        "rgba(16, 185, 129, ", // Emerald
        "rgba(251, 191, 36, "  // Amber
      ];

      for (let s = 0; s < numStreams; s++) {
        const points2D: any[] = [];
        const baseColor = streamColors[s % streamColors.length];
        
        // Generate a flowing 3D spline along X axis from -150 to 150
        for (let xp = -150; xp <= 150; xp += 10) {
          const centerDist = Math.abs(xp) / 150; // 0 at center, 1 at edges
          
          // Squeeze near center to create orbital wrapping, expand at edges
          const squeeze = 0.35 + 0.65 * Math.sin(centerDist * Math.PI / 2);
          
          const speedFactor = 0.04 + s * 0.01;
          const thetaVal = (xp * 0.02) - (phase * speedFactor) + (s * Math.PI * 0.4);
          
          const ampY = 32 + Math.sin(phase * 0.03 + s) * 10;
          const ampZ = 28 + Math.cos(phase * 0.02 + s) * 8;
          
          let flowX = xp;
          let flowY = Math.sin(thetaVal) * ampY * squeeze;
          let flowZ = Math.cos(thetaVal) * ampZ * squeeze;
          
          // Apply audio vibration
          if (state === "speaking" || state === "listening" || state === "wake_listening") {
            const volAmp = Math.min(2.0, audioVolume * 25);
            const waveFreq = 0.07 + s * 0.02;
            const vib = Math.sin(xp * waveFreq + phase * 0.6) * volAmp * 18 * (1 - centerDist);
            flowY += vib;
            flowZ += vib;
          }
          
          // Rotate in 3D sync with the brain nodes
          flowX *= scaleMult;
          flowY *= scaleMult;
          flowZ *= scaleMult;
          
          const rx = flowX * cosY - flowZ * sinY;
          let rz = flowX * sinY + flowZ * cosY;
          const ry = flowY * cosX - rz * sinX;
          rz = flowY * sinX + rz * cosX;
          
          const focalLength = 160;
          const zOffset = 130;
          const distanceScale = focalLength / (rz + zOffset);
          const sx = rx * distanceScale + centerX;
          const sy = ry * distanceScale + centerY;
          const alpha = Math.max(0.05, Math.min(0.85, (rz + 40) / 80));
          
          points2D.push({ sx, sy, sz: rz, alpha, color: baseColor });
        }
        streamPoints2D.push(points2D);
      }

      // Draw the neural stream web lines
      streamPoints2D.forEach((pts, sIdx) => {
        if (pts.length < 2) return;
        
        for (let i = 1; i < pts.length; i++) {
          const p1 = pts[i - 1];
          const p2 = pts[i];
          
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          
          const avgAlpha = (p1.alpha + p2.alpha) / 2;
          const streamAlpha = avgAlpha * 0.35 * activityFactor;
          
          ctx.strokeStyle = `${p1.color}${streamAlpha})`;
          ctx.lineWidth = (sIdx % 2 === 0 ? 1.4 : 0.9) * activityFactor;
          ctx.stroke();
        }
      });

      // --- Draw Connections ---

      // 1. Core hemisphere synapses
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const n1 = projected[i];
          const n2 = projected[j];
          if (n1.isBase && n2.isBase) {
            const dx = n1.sx - n2.sx;
            const dy = n1.sy - n2.sy;
            const dist2D = Math.sqrt(dx * dx + dy * dy);

            if (dist2D < connectionThreshold * 1.5) {
              const distanceRatio = dist2D / (connectionThreshold * 1.5);
              const lineAlpha = (1 - distanceRatio) * 0.16 * activityFactor * n1.alpha;

              ctx.beginPath();
              ctx.lineWidth = 0.8;
              ctx.strokeStyle = `${emotionSynapseColor}${lineAlpha})`;
              ctx.moveTo(n1.sx, n1.sy);
              ctx.lineTo(n2.sx, n2.sy);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Neon Grown Core synaptic lines (connecting knowledge back into closest brain core parts!)
      projected.forEach((knode) => {
        if (knode.isKnowledge) {
          let closestBase: any = null;
          let minDist = 9999;
          
          projected.forEach((bnode) => {
            if (bnode.isBase) {
              const dx = knode.sx - bnode.sx;
              const dy = knode.sy - bnode.sy;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < minDist) {
                minDist = d;
                closestBase = bnode;
              }
            }
          });

          if (closestBase) {
            ctx.beginPath();
            ctx.lineWidth = 0.9;
            const lineAlpha = 0.26 * knode.alpha;
            ctx.strokeStyle = `rgba(6, 182, 212, ${lineAlpha})`;
            ctx.moveTo(knode.sx, knode.sy);
            ctx.lineTo(closestBase.sx, closestBase.sy);
            ctx.stroke();

            // Tiny integrated neural pulses
            if (phase % 12 < 4) {
              const numSeed = parseInt(knode.id.replace(/\D/g, "") || "1");
              const progress = (phase * 0.04 + (isNaN(numSeed) ? 0.5 : numSeed / 1000)) % 1;
              const sx = knode.sx + (closestBase.sx - knode.sx) * progress;
              const sy = knode.sy + (closestBase.sy - knode.sy) * progress;
              ctx.fillStyle = knode.color;
              ctx.beginPath();
              ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      });

      // 3. FIFO Active Data Link (glowing research transmission cable!)
      const centerNode = projected.find(n => n.isQueueCenter);
      const procNode = projected.find(n => n.isQueueTask && n.isProcessing);
      if (centerNode && procNode) {
        ctx.beginPath();
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = "rgba(244, 63, 94, 0.5)";
        ctx.moveTo(centerNode.sx, centerNode.sy);
        ctx.lineTo(procNode.sx, procNode.sy);
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.setLineDash([3, 3]);
        ctx.moveTo(centerNode.sx, centerNode.sy);
        ctx.lineTo(procNode.sx, procNode.sy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Flying red-rose packets
        const packets = 3;
        for (let p = 0; p < packets; p++) {
          const progress = (phase * 0.12 + (p / packets)) % 1;
          const px = centerNode.sx + (procNode.sx - centerNode.sx) * progress;
          const py = centerNode.sy + (procNode.sy - centerNode.sy) * progress;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#f43f5e";
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        const mx = (centerNode.sx + procNode.sx) / 2;
        const my = (centerNode.sy + procNode.sy) / 2 - 8;
        ctx.fillStyle = "#f43f5e";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("NEURAL SYNAPSE SYNCING...", mx, my);
      }

      // 4. Draw dynamic cross-conduit synapses connecting streams to core nodes
      projected.forEach((node) => {
        if (node.isBase) {
          streamPoints2D.forEach((pts) => {
            pts.forEach((pt) => {
              const dx = pt.sx - node.sx;
              const dy = pt.sy - node.sy;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < 18) {
                ctx.beginPath();
                ctx.lineWidth = 0.4;
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * pt.alpha * node.alpha})`;
                ctx.moveTo(pt.sx, pt.sy);
                ctx.lineTo(node.sx, node.sy);
                ctx.stroke();
              }
            });
          });
        }
      });

      // 5. ECOSYSTEM NEURAL WAVE CHANNELS (Dynamic bridges between Left and Right cores)
      const coreLeft = projected.find(n => n.id === "core_left_center");
      const coreRight = projected.find(n => n.id === "core_right_center");

      if (coreLeft && coreRight) {
        const x1 = coreLeft.sx;
        const y1 = coreLeft.sy;
        const x2 = coreRight.sx;
        const y2 = coreRight.sy;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len > 2) {
          const nx = -dy / len;
          const ny = dx / len;

          const channels = [
            { id: "ch_1", color: "rgba(0, 242, 254, ", freq: 1.0, amp: 14, speed: 0.05, label: "SYNAPSE INTEL" },
            { id: "ch_2", color: "rgba(236, 72, 153, ", freq: 2.0, amp: -18, speed: -0.07, label: "EMOTIVE SYNC" },
            { id: "ch_3", color: "rgba(168, 85, 247, ", freq: 1.5, amp: 22, speed: 0.06, label: "KNOWLEDGE LOOP" },
            { id: "ch_4", color: "rgba(16, 185, 129, ", freq: 2.5, amp: -12, speed: -0.04, label: "RESONANCE FLUX" }
          ];

          channels.forEach((chan, idx) => {
            // Draw the organic glowing wave conduit curve
            ctx.beginPath();
            let first = true;
            for (let t = 0; t <= 1.01; t += 0.02) {
              const tx = x1 + (x2 - x1) * t;
              const ty = y1 + (y2 - y1) * t;
              // Squeeze wave to 0 at both ends using Math.sin(t * Math.PI)
              const waveOffset = Math.sin(t * Math.PI * chan.freq + phase * chan.speed * 2) * chan.amp * Math.sin(t * Math.PI);
              const px = tx + nx * waveOffset;
              const py = ty + ny * waveOffset;

              if (first) {
                ctx.moveTo(px, py);
                first = false;
              } else {
                ctx.lineTo(px, py);
              }
            }
            const activeAlpha = state === "thinking" ? 0.6 : state === "speaking" || state === "listening" ? 0.4 : 0.22;
            ctx.strokeStyle = `${chan.color}${activeAlpha * coreLeft.alpha})`;
            ctx.lineWidth = (state === "thinking" ? 1.8 : 1.0) * coreLeft.alpha;
            ctx.stroke();

            // Draw flowing wave neural signals (moving photon packets)
            const numParticles = state === "thinking" ? 4 : 2;
            for (let k = 0; k < numParticles; k++) {
              const progressSpeed = 0.005 + idx * 0.002;
              const progress = (phase * progressSpeed * 2.5 + (k / numParticles)) % 1;

              // Interpolate coordinates along the wave for 'progress'
              const tx = x1 + (x2 - x1) * progress;
              const ty = y1 + (y2 - y1) * progress;
              const waveOffset = Math.sin(progress * Math.PI * chan.freq + phase * chan.speed * 2) * chan.amp * Math.sin(progress * Math.PI);
              const px = tx + nx * waveOffset;
              const py = ty + ny * waveOffset;

              const sizePulse = 2.2 + Math.sin(phase * 0.15 + k) * 0.8;
              
              // Draw outer glowing neon halo
              ctx.beginPath();
              ctx.arc(px, py, sizePulse + 4, 0, Math.PI * 2);
              ctx.fillStyle = `${chan.color}0.15)`;
              ctx.fill();

              // Draw main core signal particle
              ctx.beginPath();
              ctx.arc(px, py, sizePulse, 0, Math.PI * 2);
              ctx.fillStyle = "#ffffff";
              ctx.shadowBlur = 10;
              ctx.shadowColor = chan.color.replace(", ", ")");
              ctx.fill();
              ctx.shadowBlur = 0;

              // Draw flowing particle trailing wave spark
              const trailProgress = Math.max(0, progress - 0.03);
              const txT = x1 + (x2 - x1) * trailProgress;
              const tyT = y1 + (y2 - y1) * trailProgress;
              const waveOffsetT = Math.sin(trailProgress * Math.PI * chan.freq + phase * chan.speed * 2) * chan.amp * Math.sin(trailProgress * Math.PI);
              const pxT = txT + nx * waveOffsetT;
              const pyT = tyT + ny * waveOffsetT;

              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(pxT, pyT);
              ctx.strokeStyle = `${chan.color}0.75)`;
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
          });
        }

        // Draw internal local synapses linking Core Centers to their respective hemisphere node points
        projected.forEach((bnode) => {
          if (bnode.isBase) {
            // Left base nodes connect to Left core, Right base nodes connect to Right core
            const targetCore = bnode.isLeft ? coreLeft : coreRight;
            const dx = bnode.sx - targetCore.sx;
            const dy = bnode.sy - targetCore.sy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Connect if close enough
            if (dist < 58) {
              const synapseStrength = (1 - dist / 58) * 0.28 * bnode.alpha;
              ctx.beginPath();
              ctx.lineWidth = 0.6;
              ctx.strokeStyle = bnode.isLeft ? `rgba(6, 182, 212, ${synapseStrength})` : `rgba(236, 72, 153, ${synapseStrength})`;
              ctx.moveTo(bnode.sx, bnode.sy);
              ctx.lineTo(targetCore.sx, targetCore.sy);
              ctx.stroke();

              // Occasionally shoot tiny micro-sparks along these connectors
              if (phase % 15 < 3) {
                const spProgress = (phase * 0.05) % 1;
                const spX = targetCore.sx + (bnode.sx - targetCore.sx) * spProgress;
                const spY = targetCore.sy + (bnode.sy - targetCore.sy) * spProgress;
                ctx.beginPath();
                ctx.arc(spX, spY, 0.85, 0, Math.PI * 2);
                ctx.fillStyle = bnode.color;
                ctx.fill();
              }
            }
          }
        });
      }

      // --- Draw Nodes ---
      projected.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        
        ctx.beginPath();
        let baseSize = node.sz > 0 ? 3.2 : 2.0;
        if (node.isQueueCenter) baseSize = 6.0;
        if (node.isQueueTask && node.isProcessing) baseSize = 4.5;
        if (node.isCoreCenter) baseSize = 7.5; // Larger core hubs!
        
        const nodeSize = baseSize * (1 + (state === "thinking" ? 0.25 : 0) + (isHovered ? 0.4 : 0));
        ctx.arc(node.sx, node.sy, nodeSize, 0, Math.PI * 2);
        
        ctx.fillStyle = node.color;

        if (node.isCoreCenter) {
          ctx.shadowBlur = 16;
          ctx.shadowColor = node.color;
        } else if (node.sz < 10 && (state !== "idle" || isHovered)) {
          ctx.shadowBlur = isHovered ? 12 : 6;
          ctx.shadowColor = node.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Concentric shell glow for active/hovered node
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, nodeSize + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }

        // Additional Futuristic Scopes/Rings for Core Centers
        if (node.isCoreCenter) {
          // Inner scanning shell
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, nodeSize + 5 + Math.sin(phase * 0.08) * 2, 0, Math.PI * 2);
          ctx.strokeStyle = `${node.color}55`;
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Outer orbiting tech bracket
          ctx.beginPath();
          const rotationAngle = phase * 0.04 * (node.isLeft ? 1 : -1);
          ctx.arc(node.sx, node.sy, nodeSize + 9, rotationAngle, rotationAngle + Math.PI * 1.1);
          ctx.strokeStyle = `${node.color}cc`;
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Tiny orbit point on core center
          const opx = node.sx + Math.cos(-rotationAngle * 1.5) * (nodeSize + 9);
          const opy = node.sy + Math.sin(-rotationAngle * 1.5) * (nodeSize + 9);
          ctx.beginPath();
          ctx.arc(opx, opy, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 4;
          ctx.shadowColor = node.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Render a high-contrast elegant subtitle label below the core center
          ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.fillText(node.label, node.sx, node.sy + nodeSize + 16);
        }
      });

      // --- Draw flowing quantum data packets on each stream ---
      streamPoints2D.forEach((pts, sIdx) => {
        const numPackets = 3;
        const rgbColor = sIdx % 5 === 0 ? "#06b6d4" :
                         sIdx % 5 === 1 ? "#ec4899" :
                         sIdx % 5 === 2 ? "#a855f7" :
                         sIdx % 5 === 3 ? "#10b981" : "#fbbf24";
        const baseColorRaw = streamColors[sIdx % streamColors.length].replace("rgba(", "").split(",")[0];

        for (let k = 0; k < numPackets; k++) {
          const progressSpeed = 0.007 + sIdx * 0.002;
          const progress = (phase * progressSpeed + (k / numPackets)) % 1;
          
          const floatIdx = progress * (pts.length - 1);
          const idxLow = Math.floor(floatIdx);
          const idxHigh = Math.ceil(floatIdx);
          const ratio = floatIdx - idxLow;
          
          if (idxLow >= 0 && idxHigh < pts.length) {
            const p1 = pts[idxLow];
            const p2 = pts[idxHigh];
            
            const px = p1.sx + (p2.sx - p1.sx) * ratio;
            const py = p1.sy + (p2.sy - p1.sy) * ratio;
            const pAlpha = p1.alpha + (p2.alpha - p1.alpha) * ratio;
            
            ctx.beginPath();
            const packetSize = (sIdx === 0 ? 2.5 : 1.8) * (1 + (state === "thinking" ? 0.3 : 0));
            ctx.arc(px, py, packetSize, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            
            ctx.shadowBlur = 8;
            ctx.shadowColor = rgbColor;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.beginPath();
            ctx.arc(px, py, packetSize + 3 * (1 + Math.sin(phase * 0.8 + k)), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${baseColorRaw}, ${pAlpha * 0.35})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      // --- Render Canvas labels ---
      projected.forEach((node) => {
        if (node.isKnowledge || node.isQueueTask) {
          const isHovered = hoveredNode?.id === node.id;
          if (node.sz < 20 || isHovered || node.isProcessing) {
            const labelAlpha = isHovered ? 1.0 : (node.isProcessing ? 0.9 : 0.3 * node.alpha);
            
            ctx.fillStyle = `rgba(226, 232, 240, ${labelAlpha})`;
            ctx.font = isHovered ? "bold 9px monospace" : "8px monospace";
            ctx.textAlign = node.sx > centerX ? "left" : "right";
            
            const xOffset = node.sx > centerX ? 8 : -8;
            ctx.fillText(node.label, node.sx + xOffset, node.sy + 2);
            
            if (isHovered) {
              ctx.beginPath();
              ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
              ctx.lineWidth = 0.8;
              ctx.moveTo(node.sx, node.sy);
              ctx.lineTo(node.sx + (node.sx > centerX ? 4 : -4), node.sy - 4);
              ctx.stroke();
            }
          }
        }
      });

      // Hover calculations
      let closestNode: any = null;
      let minDistance = 15;
      
      if (mouseRef.current) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        
        projected.forEach((node) => {
          if (node.isKnowledge || node.isQueueTask) {
            const dx = node.sx - mx;
            const dy = node.sy - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) {
              minDistance = dist;
              closestNode = node;
            }
          }
        });
      }

      // Save state to ref to avoid triggering re-renders inside the rendering loop
      if (closestNode) {
        if (hoveredNodeIdRef.current !== closestNode.id) {
          hoveredNodeIdRef.current = closestNode.id;
          setTimeout(() => {
            setHoveredNode(closestNode);
          }, 0);
        }
      } else {
        if (hoveredNodeIdRef.current !== null) {
          hoveredNodeIdRef.current = null;
          setTimeout(() => {
            setHoveredNode(null);
          }, 0);
        }
      }

      // Draw 3 layers of beautiful, overlapping, filled bottom waves! ("wave thakbe")
      const waveY = height - 18;
      const numWaves = 3;
      const waveColors = [
        emotion === "anger" ? ["rgba(239, 68, 68, 0.22)", "rgba(220, 38, 38, 0.03)"] :
        emotion === "joy" ? ["rgba(251, 191, 36, 0.22)", "rgba(217, 119, 6, 0.03)"] :
        emotion === "sorrow" ? ["rgba(59, 130, 246, 0.18)", "rgba(29, 78, 216, 0.03)"] :
        emotion === "surprise" ? ["rgba(236, 72, 153, 0.22)", "rgba(190, 24, 74, 0.03)"] :
        ["rgba(6, 182, 212, 0.22)", "rgba(8, 145, 178, 0.03)"],

        emotion === "anger" ? ["rgba(239, 68, 68, 0.15)", "rgba(185, 28, 28, 0.01)"] :
        emotion === "joy" ? ["rgba(251, 191, 36, 0.15)", "rgba(180, 83, 9, 0.01)"] :
        emotion === "sorrow" ? ["rgba(96, 165, 250, 0.15)", "rgba(30, 64, 175, 0.01)"] :
        emotion === "surprise" ? ["rgba(244, 114, 182, 0.15)", "rgba(157, 23, 77, 0.01)"] :
        ["rgba(168, 85, 247, 0.15)", "rgba(109, 40, 217, 0.01)"],

        emotion === "anger" ? ["rgba(254, 226, 226, 0.1)", "rgba(239, 68, 68, 0)"] :
        emotion === "joy" ? ["rgba(254, 243, 199, 0.1)", "rgba(251, 191, 36, 0)"] :
        emotion === "sorrow" ? ["rgba(219, 234, 254, 0.08)", "rgba(59, 130, 246, 0)"] :
        emotion === "surprise" ? ["rgba(253, 224, 241, 0.1)", "rgba(236, 72, 153, 0)"] :
        ["rgba(34, 211, 238, 0.1)", "rgba(6, 182, 212, 0)"]
      ];

      for (let wIdx = 0; wIdx < numWaves; wIdx++) {
        ctx.beginPath();
        
        const currentColors = waveColors[wIdx];
        const grad = ctx.createLinearGradient(0, waveY - 50, 0, height);
        grad.addColorStop(0, currentColors[0]);
        grad.addColorStop(1, currentColors[1]);

        let amplitude = 2;
        let freq = 0.04;

        if (state === "speaking") {
          const volAmp = Math.min(1.5, audioVolume * 15);
          amplitude = (10 - wIdx * 2.5) + Math.sin(phase * 0.8 - wIdx * 0.5) * 22 * volAmp;
          freq = 0.04 + wIdx * 0.01;
        } else if (state === "listening" || state === "wake_listening") {
          const volAmp = Math.min(1.5, audioVolume * 15);
          amplitude = (6 - wIdx) + Math.abs(Math.sin(phase * 1.5 - wIdx * 0.4)) * 30 * volAmp;
          freq = 0.05 + wIdx * 0.015;
        } else if (state === "thinking") {
          amplitude = (5 - wIdx * 0.8) + Math.sin(phase * 2.5 - wIdx * 0.6) * 6;
          freq = 0.035 + wIdx * 0.01;
        } else {
          amplitude = 1.8 + Math.sin(phase * 0.4 - wIdx * 0.8) * 1.8;
          freq = 0.025 + wIdx * 0.005;
        }

        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 4) {
          const edgeMult = Math.sin((x / width) * Math.PI);
          const y = waveY + Math.sin(x * freq + phase * 0.55 - wIdx * 1.2) * amplitude * edgeMult;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke outline for the top edge of each wave layer
        ctx.beginPath();
        for (let x = 0; x <= width; x += 4) {
          const edgeMult = Math.sin((x / width) * Math.PI);
          const y = waveY + Math.sin(x * freq + phase * 0.55 - wIdx * 1.2) * amplitude * edgeMult;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = currentColors[0].replace("0.22", "0.55").replace("0.15", "0.45").replace("0.1", "0.35");
        ctx.lineWidth = 1.2 - wIdx * 0.25;
        ctx.stroke();
      }

      phase += 0.12;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [dimensions.width, dimensions.height]);

  return (
    <div id="ruvi-neural-waveform" className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-4 flex flex-col shadow-[0_0_20px_rgba(0,242,254,0.06)] min-h-[300px] items-center justify-center relative overflow-hidden transition-all duration-300">
      
      {/* Dynamic background radial lighting based on brain operations */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
        queue.length > 0 ? "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.06)_0%,transparent_70%)]" :
        state === "thinking" ? "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06)_0%,transparent_70%)]" :
        (state === "listening" || state === "wake_listening") ? "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)]" :
        "bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.02)_0%,transparent_70%)]"
      }`} />
      
      {/* HUD Header Bar */}
      <div className="w-full flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2 relative z-10">
        <div className="flex items-center gap-1.5">
          <Brain className={`w-3.5 h-3.5 ${
            queue.length > 0 ? "text-rose-400 animate-pulse" :
            state === "thinking" ? "text-pink-400 animate-pulse" :
            state === "speaking" ? "text-cyan-400 animate-bounce" :
            (state === "listening" || state === "wake_listening") ? "text-emerald-400 animate-spin" : "text-slate-500"
          }`} />
          <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1">
            RUVI COGNITIVE CORE
            {queue.length > 0 && (
              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[7px] px-1 py-0.5 rounded animate-pulse">
                GROWING ({queue.length})
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/50 border border-slate-800 rounded-full px-2.5 py-0.5 text-[8px] font-mono font-bold tracking-wider">
          <span className={`w-1 h-1 rounded-full ${
            queue.length > 0 ? "bg-rose-500 shadow-[0_0_4px_#f43f5e] animate-ping" :
            emotion === "anger" ? "bg-red-500 shadow-[0_0_4px_#ef4444]" :
            emotion === "joy" ? "bg-amber-400 shadow-[0_0_4px_#fbbf24]" :
            emotion === "sorrow" ? "bg-blue-400 shadow-[0_0_4px_#3b82f6]" :
            "bg-cyan-400 shadow-[0_0_4px_#06b6d4]"
          }`} />
          <span className="text-slate-500 uppercase">SYS_MOOD:</span>
          <span className={`uppercase ${
            queue.length > 0 ? "text-rose-400" :
            emotion === "anger" ? "text-red-400" :
            emotion === "joy" ? "text-amber-400" :
            emotion === "sorrow" ? "text-blue-400" :
            "text-cyan-400"
          }`}>
            {queue.length > 0 ? "learning" : emotion}
          </span>
        </div>
      </div>
      
      <div ref={containerRef} className="relative w-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ width: dimensions.width, height: dimensions.height }}
          className="relative z-10 cursor-crosshair max-w-full"
        />

        {/* Real-time interactive glass-HUD overlay on hover */}
        {hoveredNode && (
          <div className="absolute top-1 left-2 right-2 bg-slate-950/95 border border-cyan-500/40 rounded-xl p-3 shadow-[0_0_20px_rgba(6,182,212,0.15)] z-20 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 mb-1">
              <div className="flex items-center gap-1.5">
                {hoveredNode.isQueueTask ? (
                  <Layers className="w-3 h-3 text-rose-400 animate-pulse" />
                ) : (
                  <Cpu className="w-3 h-3 text-cyan-400" />
                )}
                <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-widest">
                  {hoveredNode.isQueueTask ? "TRANSIT NODE IN QUEUE" : `KNOWLEDGE NODE: ${hoveredNode.channel}`}
                </span>
              </div>
              <span className="text-[7.5px] font-mono bg-slate-900 text-slate-500 px-1 py-0.5 rounded">
                D-ID: {hoveredNode.id.slice(0, 8)}
              </span>
            </div>
            
            <h4 className="font-sans font-extrabold text-xs text-white truncate flex items-center gap-1">
              {hoveredNode.label}
            </h4>
            
            {hoveredNode.isKnowledge ? (
              <div className="mt-1 space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>CONFIDENCE INTEGRITY:</span>
                  <span className="text-cyan-400 font-bold">{hoveredNode.confidenceScore}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-sky-500 h-full rounded-full" style={{ width: `${hoveredNode.confidenceScore}%` }} />
                </div>
                <p className="text-[9px] text-slate-300 font-mono leading-relaxed line-clamp-2 mt-1">
                  <b>USEFULNESS:</b> {hoveredNode.whyUseful || hoveredNode.evidence || "No cached usefulness logs."}
                </p>
              </div>
            ) : (
              <div className="mt-1 flex justify-between items-center text-[8.5px] font-mono">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">CHANNEL:</span>
                  <span className="text-amber-400 font-bold uppercase">{hoveredNode.channel}</span>
                </div>
                <span className={`px-1 rounded text-[7.5px] font-bold ${hoveredNode.isProcessing ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                  {hoveredNode.isProcessing ? "SYNC ACTIVE" : "AWAITING SYNC"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic transcript bubble */}
      {(state === "listening" || state === "wake_listening") && transcript && (
        <div className="mt-1 w-full text-center text-emerald-300 font-mono text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/40 max-w-[320px] z-10 animate-fade-in leading-relaxed select-none break-words flex items-center justify-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
          <span>"{transcript}"</span>
        </div>
      )}

      {/* Noise suppression calibration bar */}
      {calibrationStatus && (
        <div className="mt-3 flex items-center gap-3 px-3.5 py-1 bg-slate-950/85 border border-slate-800 rounded-full shadow-inner text-[10px] font-mono z-10 select-none">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${calibrationStatus.isCalibrating ? "bg-amber-400 animate-ping" : "bg-cyan-400"}`} />
            <span className="text-slate-500 font-medium">NOISE FILTER:</span>
            <span className={calibrationStatus.isCalibrating ? "text-amber-400 font-bold" : "text-cyan-400 font-bold"}>
              {calibrationStatus.isCalibrating ? "CALIBRATING..." : `${calibrationStatus.noiseFloorDB} dB`}
            </span>
          </div>
          
          <span className="text-slate-800">|</span>
          
          <button 
            onClick={onCalibrate}
            disabled={calibrationStatus.isCalibrating}
            className="text-[9px] font-extrabold text-cyan-400 hover:text-cyan-200 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {calibrationStatus.isCalibrating ? "SAMPLING" : "CALIBRATE"}
          </button>
        </div>
      )}
    </div>
  );
}
