"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Database, ExternalLink } from "lucide-react";
import { checkBackendHealth } from "@/lib/api";

interface NavbarProps {
  onOpenKB: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenKB }) => {
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

  const testConnection = async () => {
    const healthy = await checkBackendHealth();
    setIsBackendOnline(healthy);
  };

  useEffect(() => {
    testConnection();
    const interval = setInterval(testConnection, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20 text-white font-bold">
            <ShieldCheck className="w-6 h-6 text-slate-950" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                GHOST
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 tracking-wider">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Enterprise Content Governance Engine
            </p>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-3">
          {/* Backend Status Indicator */}
          <div
            onClick={testConnection}
            title="Click to re-ping backend service"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-mono cursor-pointer hover:border-slate-700 transition"
          >
            {isBackendOnline === null ? (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                <span className="text-slate-400">Pinging :8000...</span>
              </>
            ) : isBackendOnline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-emerald-400 font-medium">Backend Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-400 font-medium">Backend Offline</span>
              </>
            )}
          </div>

          {/* Knowledge Base Modal Button */}
          <button
            onClick={onOpenKB}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-cyan-500/40 text-xs font-medium text-slate-200 transition shadow-sm group"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Knowledge Base</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-300 font-mono">
              8 Chunks
            </span>
          </button>

          {/* GitHub Link */}
          <a
            href="https://github.com/iprabhnoorsingh-cloud/CodeNexus-content-governance-engine"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </header>
  );
};
