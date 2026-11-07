"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Play,
  RotateCcw,
  AlertOctagon,
  FileText,
  CheckCircle2,
  Wand2,
  Check,
  Copy,
  Zap,
  Database,
  Coins,
  CheckCheck,
  Lock,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AuditPresets, PresetItem, AUDIT_PRESETS } from "@/components/AuditPresets";
import { RiskMeter } from "@/components/RiskMeter";
import { ClaimCard } from "@/components/ClaimCard";
import { KnowledgeBaseModal } from "@/components/KnowledgeBaseModal";
import { ComplianceModal } from "@/components/ComplianceModal";
import { FullAuditResponse } from "@/types";
import { runFullAudit } from "@/lib/api";

export default function AuditDashboard() {
  const [draftText, setDraftText] = useState(AUDIT_PRESETS[0].text);
  const [docType, setDocType] = useState<string>(AUDIT_PRESETS[0].docType);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    AUDIT_PRESETS[0].id
  );
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<FullAuditResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isKbModalOpen, setIsKbModalOpen] = useState(false);
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [appliedRuleIds, setAppliedRuleIds] = useState<string[]>([]);
  const [appliedClaimIds, setAppliedClaimIds] = useState<Set<string>>(new Set());
  const [isSealModalOpen, setIsSealModalOpen] = useState(false);

  const handleSelectPreset = (preset: PresetItem) => {
    setSelectedPresetId(preset.id);
    setDraftText(preset.text);
    setDocType(preset.docType);
    setErrorMessage(null);
    setAppliedClaimIds(new Set());
    setAppliedRuleIds([]);
  };

  const handleRunAudit = useCallback(async () => {
    if (!draftText.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    setAppliedClaimIds(new Set());
    setAppliedRuleIds([]);

    try {
      const result = await runFullAudit(draftText, docType);
      setAuditResult(result);
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMessage(
        errObj.message || "Failed to execute governance audit. Please check backend connection."
      );
    } finally {
      setIsLoading(false);
    }
  }, [draftText, docType]);

  // Shortcut: Cmd+Enter or Ctrl+Enter to trigger audit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunAudit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRunAudit]);

  // Apply single fix
  const handleApplySingleFix = async (
    targetText: string,
    replacementText: string,
    itemId?: string
  ) => {
    if (!targetText) return;
    const cleanReplacement = replacementText.startsWith("[Remove")
      ? ""
      : replacementText;

    let newText = draftText;
    if (cleanReplacement === "" && newText.includes(`${targetText}.`)) {
      newText = newText.replace(`${targetText}.`, "");
    } else if (newText.includes(targetText)) {
      newText = newText.replace(targetText, cleanReplacement);
    } else {
      // Fallback if a Stage 1 fix already modified part of targetText
      let adjustedTarget = targetText;
      if (auditResult) {
        for (const v of auditResult.rule_violations) {
          if (v.matched_text && v.suggested_fix) {
            adjustedTarget = adjustedTarget.replace(
              v.matched_text,
              v.suggested_fix.startsWith("[Remove") ? "" : v.suggested_fix
            );
          }
        }
      }
      newText = newText.replace(adjustedTarget, cleanReplacement);
    }
    newText = newText.replace(/\s{2,}/g, " ").trim();

    setDraftText(newText);

    if (itemId) {
      setAppliedRuleIds((prev) => [...prev, itemId]);
      setAppliedClaimIds((prev) => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
    } else if (auditResult) {
      const matchedClaim = auditResult.claim_audits.find(
        (c) => c.original_span === targetText
      );
      if (matchedClaim) {
        setAppliedClaimIds((prev) => {
          const next = new Set(prev);
          next.add(matchedClaim.claim_id);
          return next;
        });
      }
    }

    if (newText) {
      try {
        const updatedResult = await runFullAudit(newText, docType);
        setAuditResult(updatedResult);
      } catch {
        // Keep current UI state if background re-audit fails
      }
    }
  };

  const handleApplyFix = handleApplySingleFix;

  // Apply all remediations across Stage 2 non-verified claims and Stage 1 violations
  const handleApplyAllRemediations = async () => {
    if (!auditResult) return;
    let newText = draftText;
    const nextClaimIds = new Set(appliedClaimIds);

    // First replace Stage 2 claims (using full sentence spans before Stage 1 mutates substrings)
    for (const claim of auditResult.claim_audits) {
      if (
        !nextClaimIds.has(claim.claim_id) &&
        claim.original_span &&
        (Boolean(claim.suggested_remediation) ||
          claim.verdict === "CONTRADICTED" ||
          claim.verdict === "UNGROUNDED")
      ) {
        const replacement =
          !claim.suggested_remediation ||
          claim.suggested_remediation.startsWith("[Remove")
            ? ""
            : claim.suggested_remediation;

        if (newText.includes(claim.original_span)) {
          newText = newText.replace(claim.original_span, replacement);
        } else {
          let adjustedSpan = claim.original_span;
          for (const v of auditResult.rule_violations) {
            if (v.matched_text && v.suggested_fix) {
              adjustedSpan = adjustedSpan.replace(
                v.matched_text,
                v.suggested_fix
              );
            }
          }
          newText = newText.replace(adjustedSpan, replacement);
        }
        nextClaimIds.add(claim.claim_id);
      }
    }

    // Then replace any remaining Stage 1 violations
    const nextRuleIds = [...appliedRuleIds];
    for (const violation of auditResult.rule_violations) {
      if (violation.matched_text && violation.suggested_fix) {
        const cleanRuleFix = violation.suggested_fix.startsWith("[Remove")
          ? ""
          : violation.suggested_fix;
        if (cleanRuleFix === "" && newText.includes(`${violation.matched_text}.`)) {
          newText = newText.replace(`${violation.matched_text}.`, "");
        } else {
          newText = newText.replace(violation.matched_text, cleanRuleFix);
        }
        if (!nextRuleIds.includes(violation.rule_id)) {
          nextRuleIds.push(violation.rule_id);
        }
      }
    }

    newText = newText.replace(/\s{2,}/g, " ").trim();

    setDraftText(newText);
    setAppliedClaimIds(nextClaimIds);
    setAppliedRuleIds(nextRuleIds);

    if (newText) {
      try {
        const updatedResult = await runFullAudit(newText, docType);
        setAuditResult(updatedResult);
      } catch {
        // Keep current UI state if background re-audit fails
      }
    }
  };

  const hasUnappliedClaims = Boolean(
    auditResult &&
      auditResult.claim_audits.some(
        (claim) =>
          Boolean(claim.suggested_remediation) &&
          !appliedClaimIds.has(claim.claim_id)
      )
  );


  const handleCopyFix = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRuleId(id);
    setTimeout(() => setCopiedRuleId(null), 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar onOpenKB={() => setIsKbModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Presets Toolbar */}
        <AuditPresets
          onSelectPreset={handleSelectPreset}
          selectedPresetId={selectedPresetId}
        />

        {/* Error Banner */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 flex items-center justify-between gap-3 text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold text-rose-400 hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Editor & Governance Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
              {/* Document Type & Controls Header */}
              <div className="pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Document Context
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Policy scope applied during Stage 1 audit
                    </p>
                  </div>

                  <select
                    value={docType}
                    onChange={async (e) => {
                      const nextDocType = e.target.value;
                      setDocType(nextDocType);
                      if (auditResult && draftText.trim()) {
                        try {
                          const updated = await runFullAudit(
                            draftText,
                            nextDocType
                          );
                          setAuditResult(updated);
                        } catch {
                          // Keep current UI state if background re-audit fails
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="general">general</option>
                    <option value="fintech_promo">fintech_promo</option>
                    <option value="saas_sla">saas_sla</option>
                    <option value="press_release">press_release</option>
                  </select>
                </div>

                {docType === "fintech_promo" ? (
                  <div className="text-[11px] font-mono text-cyan-400/90 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    Active Policies: SEC/FINRA APY Advertising &amp; Universal Privacy
                  </div>
                ) : docType === "saas_sla" ? (
                  <div className="text-[11px] font-mono text-emerald-400/90 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Active Policies: Uptime SLAs, Tech Specs &amp; Universal Privacy
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    Active Policies: Universal Enterprise Compliance &amp; Security
                  </div>
                )}
              </div>

              {/* Textarea Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    Draft Content Under Audit
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {draftText.length} characters
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={11}
                    value={draftText}
                    onChange={(e) => {
                      setDraftText(e.target.value);
                      setSelectedPresetId(null);
                    }}
                    placeholder="Paste enterprise copy, press release, SLA claims, or promotional text here..."
                    className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950/80 text-xs sm:text-sm text-slate-200 font-mono leading-relaxed placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition resize-y"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  onClick={handleRunAudit}
                  disabled={isLoading || !draftText.trim()}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/20 active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Auditing Governance Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Run Governance Audit (⌘↵)</span>
                    </>
                  )}
                </button>

                {auditResult &&
                  !auditResult.overall_compliant &&
                  hasUnappliedClaims && (
                    <button
                      onClick={handleApplyAllRemediations}
                      title="Automatically replace all non-compliant assertions with verified ground-truth text"
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 font-semibold text-xs transition"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Apply All Fixes</span>
                    </button>
                  )}
              </div>

              {/* Engine Specification Footer */}
              <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Stage 1 Deterministic SLA:</span>
                  <span className="text-cyan-400">&lt;50ms ReDoS-safe</span>
                </div>
                <div className="flex justify-between">
                  <span>Stage 2 Citation Lock:</span>
                  <span className="text-indigo-400">pgvector cosine &gt;0.45</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Governance Audit Results (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Case 1: Initial Empty State */}
            {!auditResult && !isLoading && (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="font-bold text-slate-200 text-base">
                    Ready for Enterprise Compliance Audit
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select a preset draft above or enter custom promotional copy,
                    then click <strong className="text-slate-200">Run Governance Audit</strong>.
                    Stage 1 will run deterministic regex rules, followed by citation-locked
                    vector grounding in Stage 2.
                  </p>
                </div>
              </div>
            )}

            {/* Case 2: Auditing Skeleton Loader */}
            {isLoading && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 animate-pulse">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="h-6 w-48 bg-slate-800 rounded" />
                  <div className="h-6 w-24 bg-slate-800 rounded-full" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-slate-800 rounded" />
                  <div className="h-4 w-3/4 bg-slate-800 rounded" />
                </div>
                <div className="h-24 w-full bg-slate-950/60 rounded-xl" />
                <div className="space-y-3">
                  <div className="h-28 w-full bg-slate-950/60 rounded-xl" />
                  <div className="h-28 w-full bg-slate-950/60 rounded-xl" />
                </div>
              </div>
            )}

            {/* Case 3: Audit Results View */}
            {auditResult && !isLoading && (
              <div className="space-y-4 animate-fadeIn">
                {/* Governance Status Banner */}
                <div
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-lg ${
                    auditResult.overall_compliant
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/5"
                      : "bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-rose-500/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        auditResult.overall_compliant
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/20 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {auditResult.overall_compliant ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <AlertOctagon className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base sm:text-lg font-mono tracking-tight">
                          {auditResult.governance_state}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            auditResult.overall_compliant
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                          }`}
                        >
                          {auditResult.overall_compliant ? "PASSED" : "ACTION REQUIRED"}
                        </span>
                      </div>
                      <p className="text-xs opacity-90 mt-0.5">
                        {auditResult.overall_compliant
                          ? "All regulatory policies satisfied and all factual assertions verified against enterprise documents."
                          : "Critical rule blockers, ungrounded assertions, or factual contradictions detected."}
                      </p>
                    </div>
                  </div>

                  {/* Stage Pass/Fail Pills */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span
                      className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
                        auditResult.stage1_passed
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      Stage 1: {auditResult.stage1_passed ? "PASS" : "FAIL"}
                    </span>
                    <span
                      className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
                        auditResult.stage2_passed
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      Stage 2: {auditResult.stage2_passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                </div>

                {/* Risk Score & Latency Meter */}
                <RiskMeter
                  score={auditResult.hallucination_risk_score}
                  stage1LatencyMs={auditResult.stage1_latency_ms}
                  stage2LatencyMs={auditResult.stage2_latency_ms}
                  totalLatencyMs={auditResult.total_latency_ms}
                />

                {/* Stage 1: Deterministic Rule Violations */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Stage 1 Policy Violations
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          auditResult.rule_violations.length === 0
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {auditResult.rule_violations.length} Detected
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Execution: {auditResult.stage1_latency_ms.toFixed(1)}ms
                    </span>
                  </div>

                  {auditResult.rule_violations.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Zero rule violations. All deterministic policy checks cleared.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {auditResult.rule_violations.map((violation, idx) => {
                        const isBlocker = violation.severity === "BLOCKER";
                        return (
                          <div
                            key={`${violation.rule_id}-${idx}`}
                            className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                              isBlocker
                                ? "bg-rose-950/20 border-rose-900/60"
                                : "bg-amber-950/20 border-amber-900/60"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 font-mono">
                                <span className="font-bold text-slate-200">
                                  {violation.rule_id}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isBlocker
                                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                                      : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                  }`}
                                >
                                  {violation.severity}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    handleCopyFix(violation.rule_id, violation.suggested_fix)
                                  }
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition"
                                >
                                  {copiedRuleId === violation.rule_id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Fix</span>
                                    </>
                                  )}
                                </button>
                                                              {!appliedRuleIds.includes(violation.rule_id) && (
                                <button
                                  onClick={() =>
                                    handleApplySingleFix(
                                      violation.matched_text,
                                      violation.suggested_fix,
                                      violation.rule_id
                                    )
                                  }
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-semibold text-[10px] transition"
                                >
                                  Apply Fix
                                </button>
                              )}

                              </div>
                            </div>

                            <p className="text-slate-300">{violation.message}</p>

                            <div className="font-mono text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase">
                                  Matched Text:
                                </span>
                                <span className="text-rose-300">
                                  &ldquo;{violation.matched_text}&rdquo;
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase">
                                  Compliant Replacement:
                                </span>
                                <span className="text-emerald-400">
                                  &ldquo;{violation.suggested_fix}&rdquo;
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Stage 2: Atomic Claim Audits */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-800/70 mb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="whitespace-nowrap font-bold text-slate-100 text-sm tracking-wide shrink-0">
                          STAGE 2 CITATION — LOGGED CLAIMS
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 whitespace-nowrap">
                          {auditResult.claim_audits.length} Assertions
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                          Cosine threshold: 0.45
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Decomposed factual sentences grounded against pgvector knowledge chunks
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasUnappliedClaims && (
                        <button
                          onClick={handleApplyAllRemediations}
                          className="h-8 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 whitespace-nowrap transition"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Apply All Fixes</span>
                        </button>
                      )}
                      <button
                        onClick={() =>
                          auditResult.overall_compliant &&
                          setIsSealModalOpen(true)
                        }
                        disabled={!auditResult.overall_compliant}
                        title={
                          auditResult.overall_compliant
                            ? "Generate Cryptographic Compliance Certificate"
                            : "Requires 100% Compliance Clearance"
                        }
                        className={
                          auditResult.overall_compliant
                            ? "h-8 px-3 py-1.5 text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition"
                            : "h-8 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-500 cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap transition"
                        }
                      >
                        {auditResult.overall_compliant ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Generate Compliance Seal</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Compliance Seal (Locked)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* FinOps Architecture Telemetry Bar */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        Stage-1 Deterministic Gate
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px]">
                        &lt; 2ms latency • Regex/Rules • $0.00 API Cost
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Database className="w-3 h-3 text-cyan-400" />
                        Stage-2 Vector Verification
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px]">
                        pgvector RAG + Gemini Flash • Citation Locked
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-indigo-400" />
                        Token Optimization
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[11px]">
                        ~92% LLM Cost Reduction vs Raw Prompting
                      </span>
                    </div>
                  </div>

                  {auditResult.claim_audits.length === 0 ? (
                    <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-slate-400 text-xs">
                      No factual assertions identified in the draft for vector grounding.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditResult.claim_audits.map((claim) => (
                        <ClaimCard
                          key={claim.claim_id}
                          claim={claim}
                          onApplyFix={handleApplyFix}
                          isApplied={appliedClaimIds.has(claim.claim_id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Ground Truth Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={isKbModalOpen}
        onClose={() => setIsKbModalOpen(false)}
      />

      {/* Cryptographic Compliance Seal Modal */}
      <ComplianceModal
        isOpen={isSealModalOpen}
        onClose={() => setIsSealModalOpen(false)}
        draftText={draftText}
        claims={auditResult?.claim_audits || []}
      />
    </div>
  );
}
