# GHOST: Enterprise AI Content Governance & Fact-Grounding Engine

[![CI Tests](https://img.shields.io/badge/pytest-16%20passed-emerald)](./backend)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black)](./frontend)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal)](./backend)
[![pgvector](https://img.shields.io/badge/PostgreSQL%2016-pgvector-blue)](./docker-compose.yml)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)

GHOST (**Grounded Hallucination Oversight & Safety Toolkit**) is a two-stage enterprise AI content governance engine designed to enforce factual grounding, prevent regulatory non-compliance, and remediate hallucinations before generative AI output reaches production channels.

---

## 🏛️ System Architecture

```text
Draft AI Copy / Content Ingestion
               │
               ▼
┌──────────────────────────────────────────────┐
│  Stage 1: Deterministic Rule Engine (<50ms)   │
│  - ReDoS-safe bounded regex patterns         │
│  - Regulatory financial return filters       │
│  - Absolute SLA uptime & immunity blockers   │
│  - PII / telemetry 90-day retention policies │
└──────────────────────┬───────────────────────┘
                       │
             Pass / Warning / Fall-through
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 2: Citation-Locked pgvector RAG       │
│  - Prompt-injection heuristic guard          │
│  - Atomic factual claim decomposition        │
│  - 384-dimensional semantic embedding match │
│  - Cosine threshold gating (≥ 0.45)          │
│  - Numeric/entity ground-truth verification  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Governance Orchestrator & Scoring           │
│  - Hallucination Risk Score (0 - 100)        │
│  - Governance State Machine                  │
│    (COMPLIANCE_APPROVED | ACTION_REQUIRED)   │
│  - One-click verifiable remediation diffs    │
└──────────────────────────────────────────────┘

