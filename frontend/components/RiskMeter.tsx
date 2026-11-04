"use client";

import React from "react";
import { Zap, Database, Clock } from "lucide-react";

interface RiskMeterProps {
  score: number;
  stage1LatencyMs: number;
  stage2LatencyMs: number;
  totalLatencyMs: number;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({
  score,
  stage1LatencyMs,
  stage2LatencyMs,
  totalLatencyMs,
}) => {
  // Determine risk severity colors
  let colorTheme = {
    text: "text-emerald-400",
    bg: "bg-emerald-500",
    badgeBg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    label: "Safe / Zero Hallucination Risk",
    description: "All claims are verified and grounded in enterprise documents.",
  };

  if (score > 40) {
    colorTheme = {
      text: "text-rose-400",
      bg: "bg-rose-500",
      badgeBg: "bg-rose-500/10",
      border: "border-rose-500/30",
      label: "Critical Hallucination Risk",
      description: "Severe contradictions or policy blockers detected in draft.",
    };
  } else if (score > 0) {
    colorTheme = {
      text: "text-amber-400",
      bg: "bg-amber-500",
      badgeBg: "bg-amber-500/10",
      border: "border-amber-500/30",
      label: "Moderate Governance Warnings",
      description: "Ungrounded claims or policy warnings require remediation.",
    };
  }

  // Calculate percentage clamped between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-4">
      {/* Header and Risk Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Hallucination Risk Meter
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorTheme.badgeBg} ${colorTheme.border} ${colorTheme.text}`}
            >
              {colorTheme.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{colorTheme.description}</p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-extrabold font-mono ${colorTheme.text}`}>
            {clampedScore.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-400">/ 100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${colorTheme.bg}`}
            style={{ width: `${Math.max(clampedScore, 3)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>0 (Compliant)</span>
          <span>40 (Threshold)</span>
          <span>100 (Blocked)</span>
        </div>
      </div>

      {/* Latency Split Cards */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2">
        {/* Stage 1 Latency */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Stage 1 (Regex)</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold font-mono text-slate-100">
              {stage1LatencyMs.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">ms</span>
            <span className="ml-auto text-[9px] px-1 rounded bg-cyan-500/10 text-cyan-400 font-mono">
              &lt;50ms
            </span>
          </div>
        </div>

        {/* Stage 2 Latency */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Database className="w-3 h-3 text-indigo-400" />
            <span>Stage 2 (RAG)</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold font-mono text-slate-100">
              {stage2LatencyMs.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">ms</span>
          </div>
        </div>

        {/* Total Latency */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>Total Latency</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold font-mono text-slate-100">
              {totalLatencyMs.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
