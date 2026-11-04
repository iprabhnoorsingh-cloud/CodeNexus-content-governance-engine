"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  FileText,
} from "lucide-react";
import { AtomicClaimAudit, ClaimVerdict } from "@/types";

interface ClaimCardProps {
  claim: AtomicClaimAudit;
  onApplyFix?: (originalSpan: string, fixText: string) => void;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, onApplyFix }) => {
  const [isExcerptExpanded, setIsExcerptExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const getVerdictTheme = (verdict: ClaimVerdict) => {
    switch (verdict) {
      case "VERIFIED":
        return {
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          cardBorder: "border-slate-800 hover:border-emerald-500/30",
          label: "VERIFIED",
        };
      case "CONTRADICTED":
        return {
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
          cardBorder: "border-rose-950/60 hover:border-rose-500/40",
          label: "CONTRADICTED",
        };
      case "UNGROUNDED":
      default:
        return {
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          cardBorder: "border-amber-950/60 hover:border-amber-500/40",
          label: "UNGROUNDED",
        };
    }
  };

  const theme = getVerdictTheme(claim.verdict);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-xl border ${theme.cardBorder} bg-slate-900/80 p-4 transition-all duration-200 shadow-sm space-y-3`}
    >
      {/* Top Row: Claim ID, Verdict Badge, Similarity, Citation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {claim.claim_id}
          </span>
          <span
            className={`flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${theme.badge}`}
          >
            {theme.icon}
            <span>{theme.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {claim.similarity_score !== undefined &&
            claim.similarity_score !== null && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                Cosine Sim:{" "}
                <span className="text-cyan-400 font-semibold">
                  {(claim.similarity_score * 100).toFixed(1)}%
                </span>
              </span>
            )}

          {claim.citation_source && (
            <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
              <FileText className="w-3 h-3 text-indigo-400" />
              <span>{claim.citation_source}</span>
            </span>
          )}
        </div>
      </div>

      {/* Original Claim Assertion */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Extracted Assertion
        </div>
        <p className="text-xs text-slate-200 font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
          &ldquo;{claim.original_span}&rdquo;
        </p>
      </div>

      {/* Retrieved Ground-Truth Excerpt (Collapsible) */}
      {claim.retrieved_excerpt && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden text-xs">
          <button
            onClick={() => setIsExcerptExpanded(!isExcerptExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-left text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition"
          >
            <span className="font-semibold text-[11px] flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-cyan-400" />
              Enterprise Ground-Truth Excerpt
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              {isExcerptExpanded ? "Collapse" : "Expand"}
              {isExcerptExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {isExcerptExpanded && (
            <div className="p-3 border-t border-slate-800 text-slate-300 leading-relaxed italic bg-slate-950/70 border-l-2 border-l-cyan-500">
              &ldquo;{claim.retrieved_excerpt}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Gap Analysis / Explanation */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
          Factual Verification Analysis
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {claim.explanation}
        </p>
      </div>

      {/* Remediation Box */}
      {claim.suggested_remediation && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Approved Remediation Fix
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCopy(claim.suggested_remediation || "")}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              {onApplyFix && (
                <button
                  onClick={() =>
                    onApplyFix(
                      claim.original_span,
                      claim.suggested_remediation || ""
                    )
                  }
                  className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-[10px] transition"
                >
                  Apply Fix
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-cyan-100 font-mono leading-relaxed">
            {claim.suggested_remediation}
          </p>
        </div>
      )}
    </div>
  );
};
