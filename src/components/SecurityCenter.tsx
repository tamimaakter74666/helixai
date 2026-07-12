import React from "react";
import OSWindow from "./OSWindow";
import { Shield, Lock, Key, Eye, AlertTriangle, Fingerprint } from "lucide-react";
import { motion } from "motion/react";

export default function SecurityCenter() {
  return (
    <OSWindow title="Security & API Vault" icon={<Shield className="w-3 h-3 text-red-400" />}>
      <div className="p-6">
        
        {/* Top Status */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-white mb-1">Maximum Security Mode Active</h2>
            <p className="text-slate-400 text-sm">All inbound connections are sandboxed. API keys are encrypted at rest.</p>
          </div>
          <button className="px-6 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/25">
            Run Audit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* API Key Vault */}
          <div className="space-y-4">
            <h3 className="text-slate-300 font-mono tracking-wider text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" /> API KEY VAULT
            </h3>
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              {['OpenAI (GPT-4)', 'Gemini Advanced', 'Anthropic (Claude)'].map((name, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-slate-200 text-sm font-medium">{name}</div>
                    <div className="text-slate-500 font-mono text-[10px] mt-0.5">sk-••••••••••••••••••••</div>
                  </div>
                  <button className="text-slate-500 hover:text-cyan-400 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button className="w-full py-3 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-sm flex items-center justify-center gap-2">
                <Key className="w-4 h-4" /> Add New Key
              </button>
            </div>
          </div>

          {/* Access Logs */}
          <div className="space-y-4">
            <h3 className="text-slate-300 font-mono tracking-wider text-sm flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-400" /> ACCESS LOGS
            </h3>
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="space-y-3">
                {[
                  { event: "Biometric Auth Success", ip: "192.168.1.104", time: "2 mins ago", status: "ok" },
                  { event: "Docker Daemon Started", ip: "localhost", time: "15 mins ago", status: "ok" },
                  { event: "Unauthorized API Attempt", ip: "45.22.109.11", time: "1 hr ago", status: "alert" },
                  { event: "System Boot", ip: "localhost", time: "3 hrs ago", status: "ok" }
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${log.status === 'alert' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <div>
                      <div className={`text-sm ${log.status === 'alert' ? 'text-red-400' : 'text-slate-300'}`}>{log.event}</div>
                      <div className="text-[10px] font-mono text-slate-500">{log.ip} • {log.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </OSWindow>
  );
}
