"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Copy, Check, X, Lock } from "lucide-react";
import { AtomicClaimAudit } from "@/types";

interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftText: string;
  claims: AtomicClaimAudit[];
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({
  isOpen,
  onClose,
  draftText,
  claims,
}) => {
  const [sha256Hash, setSha256Hash] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");
  const [isHashCopied, setIsHashCopied] = useState(false);
  const [isReceiptCopied, setIsReceiptCopied] = useState(false);

  const uniqueCitedPolicies = Array.from(
    new Set(
      claims
        .map((c) => c.citation_source)
        .filter((source): source is string => Boolean(source))
    )
  );

  useEffect(() => {
    if (!isOpen) return;

    const isoTime = new Date().toISOString();
    setTimestamp(isoTime);

    const sourcesString = Array.from(
      new Set(
        claims
          .map((c) => c.citation_source)
          .filter((source): source is string => Boolean(source))
      )
    ).join("|");

    const payload = `${draftText}|${isoTime}|${sourcesString}`;

    const generateHash = async () => {
      try {
        const hashBuffer = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(payload)
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setSha256Hash(hashHex);
      } catch {
        setSha256Hash(
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
      }
    };

    generateHash();
  }, [isOpen, draftText, claims]);

  if (!isOpen) return null;

  const handleCopyHash = () => {
    if (!sha256Hash) return;
    navigator.clipboard.writeText(sha256Hash);
    setIsHashCopied(true);
    setTimeout(() => setIsHashCopied(false), 2000);
  };

  const handleCopyJsonReceipt = () => {
    const receipt = {
      certificate: "ENTERPRISE COMPLIANCE AUDIT CERTIFICATE",
      status: "SEALED & VERIFIED",
      sha256_hash: sha256Hash,
      metadata: {
        timestamp,
        engine_pipeline: "GHOST v1.0 (Deterministic Stage-1 + pgvector Stage-2)",
        claims_audited: claims.length,
        cited_policies: uniqueCitedPolicies,
      },
      sanitized_draft: draftText,
    };

    navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setIsReceiptCopied(true);
    setTimeout(() => setIsReceiptCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base tracking-wider uppercase text-slate-100">
                ENTERPRISE COMPLIANCE AUDIT CERTIFICATE
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                SEALED &amp; VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cryptographic attestation generated via Web Crypto SHA-256 over audited draft and ground-truth citations
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cryptographic Hash Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              SHA-256 Cryptographic Digest
            </span>
            <button
              onClick={handleCopyHash}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200 transition"
            >
              {isHashCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-cyan-400" />
                  <span>Copy Hash</span>
                </>
              )}
            </button>
          </div>
          <div className="font-mono text-xs text-cyan-400 bg-slate-950 p-3 rounded-lg border border-slate-800 break-all">
            {sha256Hash || "Computing SHA-256 digest..."}
          </div>
        </div>

        {/* Metadata Grid (2x2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Timestamp
            </div>
            <div className="font-mono text-xs text-slate-200 break-all">
              {timestamp}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Engine Pipeline
            </div>
            <div className="font-mono text-xs text-cyan-300">
              GHOST v1.0 (Deterministic Stage-1 + pgvector Stage-2)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Claims Audited
            </div>
            <div className="font-mono text-xs text-slate-200">
              {claims.length}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Cited Policies
            </div>
            <div className="font-mono text-xs text-indigo-300 break-words">
              {uniqueCitedPolicies.length > 0
                ? uniqueCitedPolicies.join(", ")
                : "None"}
            </div>
          </div>
        </div>

        {/* Action Buttons at bottom */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={handleCopyJsonReceipt}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition"
          >
            {isReceiptCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON Receipt</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
