import React, { useState } from "react";
import OSWindow from "./OSWindow";
 
 
 
 
 
import { Lightbulb, Tv, Thermometer, Lock, Camera, Zap, Shield, ShieldAlert, Cpu } from "lucide-react";
import { motion } from "motion/react";

export default function SmartHomeOS() {
  const [lightsOn, setLightsOn] = useState(true);
  const [tvOn, setTvOn] = useState(false);
  const [temp, setTemp] = useState(22);

  return (
    <OSWindow title="Smart Home Hub" icon={<Lightbulb className="w-3 h-3" />}>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Living Room Lights */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          onClick={() => setLightsOn(!lightsOn)}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${lightsOn ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "bg-slate-900/50 border-slate-800"}`}
        >
          <div className="flex justify-between items-start mb-4">
            <Lightbulb className={`w-6 h-6 ${lightsOn ? "text-amber-400" : "text-slate-500"}`} />
            <div className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${lightsOn ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"}`}>
              {lightsOn ? "ACTIVE" : "OFFLINE"}
            </div>
          </div>
          <h3 className="text-white font-medium">Living Room</h3>
          <p className="text-slate-400 text-xs mt-1">Smart Bulbs</p>
        </motion.div>

        {/* Smart TV */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          onClick={() => setTvOn(!tvOn)}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${tvOn ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]" : "bg-slate-900/50 border-slate-800"}`}
        >
          <div className="flex justify-between items-start mb-4">
            <Tv className={`w-6 h-6 ${tvOn ? "text-cyan-400" : "text-slate-500"}`} />
            <div className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${tvOn ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400"}`}>
              {tvOn ? "PLAYING" : "STANDBY"}
            </div>
          </div>
          <h3 className="text-white font-medium">Media Center</h3>
          <p className="text-slate-400 text-xs mt-1">Apple TV 4K</p>
        </motion.div>

        {/* Climate Control */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="p-5 rounded-2xl border bg-slate-900/50 border-slate-800 col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <Thermometer className="w-6 h-6 text-pink-400" />
            <div className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300">
              CLIMATE SYNC
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div>
              <h3 className="text-white font-medium">Master Bedroom</h3>
              <p className="text-slate-400 text-xs mt-1">Target Temp</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setTemp(t => t - 1)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 text-white">-</button>
              <div className="text-3xl font-light text-white">{temp}°<span className="text-slate-500 text-lg">C</span></div>
              <button onClick={() => setTemp(t => t + 1)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 text-white">+</button>
            </div>
          </div>
        </motion.div>

        {/* Security Cameras */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4 text-emerald-400" />
            <h3 className="text-slate-300 text-sm font-mono tracking-wider">SECURITY FEEDS</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Front Door", url: "https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=600&auto=format&fit=crop" },
              { name: "Backyard", url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=600&auto=format&fit=crop" },
              { name: "Garage", url: "https://images.unsplash.com/photo-1574087132959-19fc49d115ee?q=80&w=600&auto=format&fit=crop" }
            ].map((cam, i) => (
              <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 group">
                <img src={cam.url} alt={cam.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-mono text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {cam.name} (LIVE)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OSWindow>
  );
}
