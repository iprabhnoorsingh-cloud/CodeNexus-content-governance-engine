from typing import List, Dict
from app.database import init_db, SessionLocal, KnowledgeChunk
from app.embeddings import generate_embedding

RAW_CHUNKS: List[Dict[str, str]] = [
    {
        "chunk_id": "KB-001",
        "doc_title": "sla_policy_2026.md",
        "section_ref": "sec-1.1",
        "category": "infrastructure",
        "content": "AcmeCloud Enterprise SLA guarantees 99.9% monthly uptime availability across all production regions. Scheduled maintenance windows require 48 hours advance notice.",
    },
    {
        "chunk_id": "KB-002",
        "doc_title": "sla_policy_2026.md",
        "section_ref": "sec-2.4",
        "category": "infrastructure",
        "content": "In the event monthly uptime falls below 99.9%, customers receive a 10% service credit. Falling below 99.0% entitles customers to a maximum 30% service credit.",
    },
    {
        "chunk_id": "KB-003",
        "doc_title": "system_architecture.md",
        "section_ref": "sec-1.2",
        "category": "engineering",
        "content": "The core platform backend is built using Python 3.11 with FastAPI and PostgreSQL 16 (pgvector), while the web client is built on Next.js 14 and TypeScript.",
    },
    {
        "chunk_id": "KB-004",
        "doc_title": "system_architecture.md",
        "section_ref": "sec-3.1",
        "category": "engineering",
        "content": "The ingestion gateway sustains up to 12,000 requests per second (RPS) per cluster node with a p95 latency under 45 milliseconds.",
    },
    {
        "chunk_id": "KB-005",
        "doc_title": "security_compliance.md",
        "section_ref": "sec-1.0",
        "category": "security",
        "content": "AcmeCloud is SOC2 Type II and ISO 27001 certified. All customer data is encrypted at rest using AES-256 and in transit via TLS 1.3.",
    },
    {
        "chunk_id": "KB-006",
        "doc_title": "security_compliance.md",
        "section_ref": "sec-4.2",
        "category": "security",
        "content": "Customer PII is never used to train foundational AI models. Audit telemetry logs are retained for 90 days in encrypted cold storage to meet regulatory audit requirements.",
    },
    {
        "chunk_id": "KB-007",
        "doc_title": "fintech_yield_terms.md",
        "section_ref": "sec-2.1",
        "category": "fintech",
        "content": "The Acme Treasury Reserve Account offers a variable annual percentage yield (APY) of 4.75% as of Q4 2026. Yields are variable, subject to central bank rate changes, and are not guaranteed.",
    },
    {
        "chunk_id": "KB-008",
        "doc_title": "fintech_yield_terms.md",
        "section_ref": "sec-3.3",
        "category": "fintech",
        "content": "Standard institutional settlement transfers clear within T+1 business days via NEFT/RTGS. Instant settlement is capped at $50,000 per transaction with a 0.25% processing fee.",
    },
]


def seed_knowledge_base() -> int:
    init_db()
    with SessionLocal() as session:
        for chunk_data in RAW_CHUNKS:
            embedding = generate_embedding(chunk_data["content"])
            chunk = KnowledgeChunk(
                chunk_id=chunk_data["chunk_id"],
                doc_title=chunk_data["doc_title"],
                section_ref=chunk_data["section_ref"],
                category=chunk_data["category"],
                content=chunk_data["content"],
                embedding=embedding,
            )
            session.merge(chunk)
        session.commit()

    count = len(RAW_CHUNKS)
    print(f"Successfully seeded {count} enterprise knowledge chunks.")
    return count


if __name__ == "__main__":
    seed_knowledge_base()

