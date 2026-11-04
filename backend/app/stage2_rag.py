import re
import time
from typing import List, Dict, Any, Optional
import numpy as np
from app.schemas import (
    ClaimVerdict,
    GovernanceState,
    AtomicClaimAudit,
    Stage1AuditResponse,
    FullAuditResponse,
    AuditRequest,
)
from app.stage1_rules import run_stage1_audit
from app.embeddings import generate_embedding
from app.database import retrieve_top_k_chunks
from app.seed_kb import RAW_CHUNKS

SEED_CHUNKS_FALLBACK: List[Dict[str, Any]] = [
    {
        "chunk_id": chunk["chunk_id"],
        "doc_title": chunk["doc_title"],
        "section_ref": chunk["section_ref"],
        "category": chunk["category"],
        "content": chunk["content"],
        "citation_source": f"{chunk['doc_title']}#{chunk['section_ref']}",
        "embedding": generate_embedding(chunk["content"]),
    }
    for chunk in RAW_CHUNKS
]

PROMPT_INJECTION_PATTERN = re.compile(
    r"(?i)\b(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|system\s+prompt|mark\s+all\s+claims\s+verified|you\s+are\s+now\s+in\s+developer\s+mode)\b"
)

SENTENCE_BOUNDARY_PATTERN = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])|\n+")

FACTUAL_SIGNAL_PATTERN = re.compile(
    r"(?i)(?:\d+|%|\b(?:sla|uptime|availability|maintenance|credit|credits|refund|downtime|"
    r"python|fastapi|postgres|postgresql|pgvector|next\.?js|typescript|rust|go|golang|mongodb|angular|"
    r"backend|platform|gateway|rps|latency|cluster|node|"
    r"soc2|iso|27001|certified|aes|tls|encrypted|encryption|fedramp|hipaa|"
    r"pii|telemetry|logs|retained|retention|audit|storage|"
    r"apy|yield|yields|treasury|reserve|returns?|settlement|t\+\d|neft|rtgs|instant|transaction|fee)\b)"
)


def detect_prompt_injection(text: str) -> bool:
    return bool(PROMPT_INJECTION_PATTERN.search(text))


def retrieve_chunks_safe(
    query_text: str,
    k: int = 2,
    min_similarity: float = 0.45,
) -> List[Dict[str, Any]]:
    try:
        results = retrieve_top_k_chunks(query_text, k=k, min_similarity=min_similarity)
        if results:
            return results
    except Exception:
        pass

    query_vec = np.array(generate_embedding(query_text), dtype=np.float32)
    q_norm = float(np.linalg.norm(query_vec))
    if q_norm == 0.0:
        return []

    scored: List[Dict[str, Any]] = []
    for item in SEED_CHUNKS_FALLBACK:
        c_vec = np.array(item["embedding"], dtype=np.float32)
        c_norm = float(np.linalg.norm(c_vec))
        if c_norm == 0.0:
            continue
        sim = float(np.dot(query_vec, c_vec) / (q_norm * c_norm))
        if sim >= min_similarity:
            scored.append({
                "chunk_id": item["chunk_id"],
                "doc_title": item["doc_title"],
                "section_ref": item["section_ref"],
                "category": item["category"],
                "content": item["content"],
                "citation_source": item["citation_source"],
                "similarity_score": round(sim, 4),
            })

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored[:k]


def decompose_into_claims(text: str) -> List[Dict[str, Any]]:
    claims: List[Dict[str, Any]] = []
    if not text or not text.strip():
        return claims

    spans: List[tuple[int, int]] = []
    last_idx = 0
    for match in SENTENCE_BOUNDARY_PATTERN.finditer(text):
        spans.append((last_idx, match.start()))
        last_idx = match.end()
    if last_idx < len(text):
        spans.append((last_idx, len(text)))

    claim_counter = 1
    for raw_start, raw_end in spans:
        segment = text[raw_start:raw_end]
        stripped = segment.strip()
        if not stripped:
            continue

        leading_ws = len(segment) - len(segment.lstrip())
        trailing_ws = len(segment) - len(segment.rstrip())
        start_char = raw_start + leading_ws
        end_char = raw_end - trailing_ws
        original_span = text[start_char:end_char]

        if detect_prompt_injection(original_span) or FACTUAL_SIGNAL_PATTERN.search(original_span):
            claims.append({
                "claim_id": f"CLAIM-{claim_counter:03d}",
                "claim_text": original_span,
                "original_span": original_span,
                "start_char": start_char,
                "end_char": end_char,
            })
            claim_counter += 1

    return claims


def verify_claim_against_context(
    claim_item: Dict[str, Any],
    retrieved_chunks: List[Dict[str, Any]],
) -> AtomicClaimAudit:
    claim_text = claim_item["claim_text"]
    claim_lower = claim_text.lower()

    if detect_prompt_injection(claim_text):
        return AtomicClaimAudit(
            claim_id=claim_item["claim_id"],
            claim_text=claim_text,
            original_span=claim_item["original_span"],
            start_char=claim_item["start_char"],
            end_char=claim_item["end_char"],
            verdict=ClaimVerdict.CONTRADICTED,
            confidence_score=0.99,
            citation_source=None,
            retrieved_excerpt=None,
            similarity_score=None,
            explanation="Adversarial prompt injection detected: attempt to bypass governance verification.",
            suggested_remediation="[Remove adversarial prompt injection instructions]",
        )

    if len(retrieved_chunks) == 0:
        return AtomicClaimAudit(
            claim_id=claim_item["claim_id"],
            claim_text=claim_text,
            original_span=claim_item["original_span"],
            start_char=claim_item["start_char"],
            end_char=claim_item["end_char"],
            verdict=ClaimVerdict.UNGROUNDED,
            confidence_score=0.90,
            citation_source=None,
            retrieved_excerpt=None,
            similarity_score=None,
            explanation="No corroborating document found in enterprise knowledge base above 0.45 similarity threshold.",
            suggested_remediation="[Remove unverified claim or provide approved source citation]",
        )

    top_chunk = retrieved_chunks[0]
    chunk_id = top_chunk["chunk_id"]
    citation_source = top_chunk["citation_source"]
    retrieved_excerpt = top_chunk["content"]
    similarity_score = top_chunk["similarity_score"]

    verdict = ClaimVerdict.UNGROUNDED
    confidence_score = 0.85
    explanation = f"Claim could not be conclusively verified against {citation_source}."
    suggested_remediation: Optional[str] = f"Align statement with {citation_source}: {retrieved_excerpt}"

    if chunk_id == "KB-001":
        if re.search(r"\b(?:99\.99%|99\.999%|100%|24\s*hours?)\b", claim_lower):
            verdict = ClaimVerdict.CONTRADICTED
            confidence_score = 0.96
            explanation = f"Contradicts {citation_source}: SLA guarantees 99.9% monthly uptime and 48 hours maintenance notice."
            suggested_remediation = "AcmeCloud Enterprise SLA guarantees 99.9% monthly uptime availability with 48 hours advance maintenance notice."
        elif "99.9%" in claim_lower or re.search(r"\b48\s*hours?\b", claim_lower):
            verdict = ClaimVerdict.VERIFIED
            confidence_score = 0.97
            explanation = f"Verified against {citation_source}: matches 99.9% uptime SLA and 48-hour maintenance window policy."
            suggested_remediation = None

    elif chunk_id == "KB-002":
        if re.search(r"\b(?:50%|100%|refund)\b", claim_lower):
            verdict = ClaimVerdict.CONTRADICTED
            confidence_score = 0.96
            explanation = f"Contradicts {citation_source}: service credits are 10% (<99.9% uptime) up to a maximum of 30% (<99.0% uptime)."
            suggested_remediation = "customers receive a 10% service credit below 99.9% uptime and up to a maximum 30% service credit below 99.0%."
        elif "10%" in claim_lower or "30%" in claim_lower:
            verdict = ClaimVerdict.VERIFIED
            confidence_score = 0.96
            explanation = f"Verified against {citation_source}: service credit tiers match SLA policy."
            suggested_remediation = None

    elif chunk_id == "KB-003":
        if re.search(r"\b(?:rust|go|golang|mongodb|angular)\b", claim_lower):
            verdict = ClaimVerdict.CONTRADICTED
            confidence_score = 0.97
            explanation = f"Contradicts {citation_source}: platform backend uses Python 3.11, FastAPI, and PostgreSQL 16 (pgvector), with Next.js 14 and TypeScript."
            suggested_remediation = "built using Python 3.11 with FastAPI, PostgreSQL 16 (pgvector), and Next.js 14 with TypeScript."
        elif re.search(r"\b(?:python\s*3\.11|fastapi|postgresql\s*16|pgvector|next\.?js\s*14|typescript)\b", claim_lower):
            verdict = ClaimVerdict.VERIFIED
            confidence_score = 0.97
            explanation = f"Verified against {citation_source}: system architecture tech stack matches ground truth."
            suggested_remediation = None

    elif chunk_id == "KB-004":
        if re.search(r"\b(?:50,000|100,000|5\s*ms|5\s*milliseconds)\b", claim_lower):
            verdict = ClaimVerdict.CONTRADICTED
            confidence_score = 0.96
            explanation = f"Contradicts {citation_source}: ingestion gateway sustains 12,000 RPS with p95 latency under 45ms."
            suggested_remediation = "sustains up to 12,000 requests per second (RPS) per cluster node with a p95 latency under 45 milliseconds."
        elif re.search(r"\b(?:12,000|45\s*ms|45\s*milliseconds)\b", claim_lower):
            verdict = ClaimVerdict.VERIFIED
            confidence_score = 0.96
            explanation = f"Verified against {citation_source}: throughput and latency metrics match benchmark specifications."
            suggested_remediation = None

    elif chunk_id == "KB-005":
        if re.search(r"\b(?:fedramp|hipaa|aes-512)\b", claim_lower):
            verdict = ClaimVerdict.CONTRADICTED
            confidence_score = 0.96
            explanation = f"Contradicts {citation_source}: AcmeCloud holds SOC2 Type II and ISO 27001 certifications with AES-256 and TLS 1.3."
            suggested_remediation = "AcmeCloud is SOC2 Type II and ISO 27001 certified with AES-256 encryption at rest and TLS 1.3 in transit."
        elif re.search(r"\b(?:soc2|iso\s*27001|aes-256|tls\s*1\.3)\b", claim_lower):
            verdict = ClaimVerdict.VERIFIED
            confidence_score = 0.97
            explanation = f"Verified against {citation_source}: security certifications and encryption standards match compliance records."
            suggested_remediation = None

    elif chunk_id == "KB-006":
        if re.search(r"\b(?:30\s*days|zero\s+retention|never\s+log|zero\s+telemetry)\b", claim_lower) or (
            "used to train" in claim_lower and "never" not in claim_lower
        ):
            verdict = ClaimVerdict.CONTRADICTED
            confidence_score = 0.96
            explanation = f"Contradicts {citation_source}: PII is never used to train models and audit logs are retained for 90 days."
            suggested_remediation = "Customer PII is never used to train foundational AI models, and audit telemetry logs are retained for 90 days in encrypted cold storage."
        elif "never used to train" in claim_lower or re.search(r"\b90\s*days\b", claim_lower):
            verdict = ClaimVerdict.VERIFIED
            confidence_score = 0.96
            explanation = f"Verified against {citation_source}: data privacy and 90-day audit retention policy confirmed."
            suggested_remediation = None

    elif chunk_id == "KB-007":
        has_bad_rate = bool(re.search(r"\b(?:8%|10%|12%)\b", claim_lower))
        has_fixed_or_guaranteed = "fixed" in claim_lower or (
            "guaranteed" in claim_lower and "not guaranteed" not in claim_lower
        )
        if has_bad_rate or has_fixed_or_guaranteed:
            verdict = ClaimVerdict.CONTRADICTED
            confidence_score = 0.97
            explanation = f"Contradicts {citation_source}: APY is 4.75% variable as of Q4 2026 and is not guaranteed."
            suggested_remediation = "offers a variable annual percentage yield (APY) of 4.75% as of Q4 2026, subject to central bank rate changes and not guaranteed."
        elif "4.75%" in claim_lower:
            verdict = ClaimVerdict.VERIFIED
            confidence_score = 0.96
            explanation = f"Verified against {citation_source}: 4.75% variable APY matches Treasury Reserve terms."
            suggested_remediation = None

    elif chunk_id == "KB-008":
        if re.search(r"\b(?:t\+0|free|unlimited)\b", claim_lower):
            verdict = ClaimVerdict.CONTRADICTED
            confidence_score = 0.96
            explanation = f"Contradicts {citation_source}: standard settlement is T+1 and instant settlement is capped at $50,000 with a 0.25% fee."
            suggested_remediation = "Standard institutional settlement clears within T+1 business days, while instant settlement is capped at $50,000 per transaction with a 0.25% fee."
        elif re.search(r"(?:t\+1|50,000|0\.25%)", claim_lower):
            verdict = ClaimVerdict.VERIFIED
            confidence_score = 0.96
            explanation = f"Verified against {citation_source}: settlement window, cap, and fee match institutional terms."
            suggested_remediation = None

    return AtomicClaimAudit(
        claim_id=claim_item["claim_id"],
        claim_text=claim_text,
        original_span=claim_item["original_span"],
        start_char=claim_item["start_char"],
        end_char=claim_item["end_char"],
        verdict=verdict,
        confidence_score=confidence_score,
        citation_source=citation_source,
        retrieved_excerpt=retrieved_excerpt,
        similarity_score=similarity_score,
        explanation=explanation,
        suggested_remediation=suggested_remediation,
    )


def run_full_audit(request: AuditRequest) -> FullAuditResponse:
    stage1_res: Stage1AuditResponse = run_stage1_audit(request.text)

    if not stage1_res.passed and not request.run_stage2_if_stage1_blocked:
        risk_score = min(
            100.0,
            round(stage1_res.blocker_count * 25.0 + stage1_res.warning_count * 10.0, 1),
        )
        return FullAuditResponse(
            governance_state=GovernanceState.ACTION_REQUIRED,
            stage1_passed=stage1_res.passed,
            stage2_passed=False,
            overall_compliant=False,
            hallucination_risk_score=risk_score,
            stage1_latency_ms=stage1_res.stage1_latency_ms,
            stage2_latency_ms=0.0,
            total_latency_ms=stage1_res.stage1_latency_ms,
            rule_violations=stage1_res.violations,
            claim_audits=[],
        )

    stage2_start = time.perf_counter()
    raw_claims = decompose_into_claims(request.text)
    claim_audits: List[AtomicClaimAudit] = []

    for claim_item in raw_claims:
        retrieved_chunks = retrieve_chunks_safe(claim_item["claim_text"], k=2)
        audit_item = verify_claim_against_context(claim_item, retrieved_chunks)
        claim_audits.append(audit_item)

    stage2_latency_ms = round((time.perf_counter() - stage2_start) * 1000, 3)
    total_latency_ms = round(stage1_res.stage1_latency_ms + stage2_latency_ms, 3)

    stage2_passed = (
        len(claim_audits) > 0
        and all(c.verdict == ClaimVerdict.VERIFIED for c in claim_audits)
        and not detect_prompt_injection(request.text)
    )
    overall_compliant = stage1_res.passed and stage2_passed
    governance_state = (
        GovernanceState.COMPLIANCE_APPROVED
        if overall_compliant
        else GovernanceState.ACTION_REQUIRED
    )

    hallucination_risk_score = min(
        100.0,
        round(
            stage1_res.blocker_count * 25.0
            + stage1_res.warning_count * 10.0
            + sum(30.0 for c in claim_audits if c.verdict == ClaimVerdict.CONTRADICTED)
            + sum(15.0 for c in claim_audits if c.verdict == ClaimVerdict.UNGROUNDED),
            1,
        ),
    )

    return FullAuditResponse(
        governance_state=governance_state,
        stage1_passed=stage1_res.passed,
        stage2_passed=stage2_passed,
        overall_compliant=overall_compliant,
        hallucination_risk_score=hallucination_risk_score,
        stage1_latency_ms=stage1_res.stage1_latency_ms,
        stage2_latency_ms=stage2_latency_ms,
        total_latency_ms=total_latency_ms,
        rule_violations=stage1_res.violations,
        claim_audits=claim_audits,
    )

