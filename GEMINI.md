# GHOST (Enterprise AI Content Governance Engine)

## Architecture
Monorepo with:
- `/backend`: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, PostgreSQL 16 + `pgvector`
- `/frontend`: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React

## Agent Rules
1. Never scan `node_modules/`, `.venv/`, `.next/`, or `__pycache__/`.
2. Never modify field names in `backend/app/schemas.py` once created; it is the single source of truth for both backend and frontend contracts.
3. Stage 1 (`stage1_rules.py`) must remain 100% deterministic, use pre-compiled ReDoS-safe regex patterns, and execute in <50ms.
4. Stage 2 (`stage2_rag.py`) must enforce citation-locked verification against PostgreSQL `pgvector` chunks with a minimum cosine similarity threshold of `0.45`.

