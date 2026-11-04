"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  Search,
  FileText,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { KnowledgeChunkItem } from "@/types";
import { fetchKnowledgeBase } from "@/lib/api";

const STATIC_FALLBACK_CHUNKS: KnowledgeChunkItem[] = [
  {
    chunk_id: "KB-001",
    doc_title: "sla_policy_2026.md",
    section_ref: "sec-1.1",
    category: "infrastructure",
    content:
      "AcmeCloud Enterprise SLA guarantees 99.9% monthly uptime availability across all production regions. Scheduled maintenance windows require 48 hours advance notice.",
  },
  {
    chunk_id: "KB-002",
    doc_title: "sla_policy_2026.md",
    section_ref: "sec-2.4",
    category: "infrastructure",
    content:
      "In the event monthly uptime falls below 99.9%, customers receive a 10% service credit. Falling below 99.0% entitles customers to a maximum 30% service credit.",
  },
  {
    chunk_id: "KB-003",
    doc_title: "system_architecture.md",
    section_ref: "sec-1.2",
    category: "engineering",
    content:
      "The core platform backend is built using Python 3.11 with FastAPI and PostgreSQL 16 (pgvector), while the web client is built on Next.js 14 and TypeScript.",
  },
  {
    chunk_id: "KB-004",
    doc_title: "system_architecture.md",
    section_ref: "sec-3.1",
    category: "engineering",
    content:
      "The ingestion gateway sustains up to 12,000 requests per second (RPS) per cluster node with a p95 latency under 45 milliseconds.",
  },
  {
    chunk_id: "KB-005",
    doc_title: "security_compliance.md",
    section_ref: "sec-1.0",
    category: "security",
    content:
      "AcmeCloud is SOC2 Type II and ISO 27001 certified. All customer data is encrypted at rest using AES-256 and in transit via TLS 1.3.",
  },
  {
    chunk_id: "KB-006",
    doc_title: "security_compliance.md",
    section_ref: "sec-4.2",
    category: "security",
    content:
      "Customer PII is never used to train foundational AI models. Audit telemetry logs are retained for 90 days in encrypted cold storage to meet regulatory audit requirements.",
  },
  {
    chunk_id: "KB-007",
    doc_title: "fintech_yield_terms.md",
    section_ref: "sec-2.1",
    category: "fintech",
    content:
      "The Acme Treasury Reserve Account offers a variable annual percentage yield (APY) of 4.75% as of Q4 2026. Yields are variable, subject to central bank rate changes, and are not guaranteed.",
  },
  {
    chunk_id: "KB-008",
    doc_title: "fintech_yield_terms.md",
    section_ref: "sec-3.3",
    category: "fintech",
    content:
      "Standard institutional settlement transfers clear within T+1 business days via NEFT/RTGS. Instant settlement is capped at $50,000 per transaction with a 0.25% processing fee.",
  },
];

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [chunks, setChunks] = useState<KnowledgeChunkItem[]>(STATIC_FALLBACK_CHUNKS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadChunks = async () => {
    setIsLoading(true);
    try {
      const data = await fetchKnowledgeBase();
      if (data?.chunks && data.chunks.length > 0) {
        setChunks(data.chunks);
      }
    } catch {
      // Use fallback chunks
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadChunks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ["all", "infrastructure", "engineering", "security", "fintech"];

  const filteredChunks = chunks.filter((chunk) => {
    const matchesCategory =
      selectedCategory === "all" ||
      chunk.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      chunk.chunk_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chunk.doc_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chunk.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chunk.section_ref.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleCopyChunk = (chunk: KnowledgeChunkItem) => {
    navigator.clipboard.writeText(chunk.content);
    setCopiedId(chunk.chunk_id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">
                  Enterprise Knowledge Base
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 font-mono">
                  {chunks.length} Ground-Truth Chunks
                </span>
              </div>
              <p className="text-xs text-slate-400">
                PostgreSQL pgvector chunk store used for citation-locked RAG verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadChunks}
              title="Refresh Knowledge Base"
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter chunks by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Chunk List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredChunks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No knowledge base chunks match your search criteria.
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.chunk_id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition space-y-2 group"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      {chunk.chunk_id}
                    </span>
                    <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                      <FileText className="w-3 h-3 text-indigo-400" />
                      {chunk.doc_title}#{chunk.section_ref}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-800">
                      {chunk.category}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyChunk(chunk)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                  >
                    {copiedId === chunk.chunk_id ? (
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
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {chunk.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>PostgreSQL 16 + pgvector (384-dimensional embeddings)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
