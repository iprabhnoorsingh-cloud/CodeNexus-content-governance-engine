from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RuleSeverity(str, Enum):
    BLOCKER = "BLOCKER"
    WARNING = "WARNING"

class ClaimVerdict(str, Enum):
    VERIFIED = "VERIFIED"
    UNGROUNDED = "UNGROUNDED"
    CONTRADICTED = "CONTRADICTED"

class GovernanceState(str, Enum):
    DRAFT = "DRAFT"
    AUDITING = "AUDITING"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    COMPLIANCE_APPROVED = "COMPLIANCE_APPROVED"

class RuleViolation(BaseModel):
    rule_id: str = Field(..., description="Unique identifier of the triggered rule")
    severity: RuleSeverity
    matched_text: str = Field(..., description="Exact substring that triggered the rule")
    start_char: int = Field(..., ge=0, description="0-based inclusive start character index")
    end_char: int = Field(..., ge=0, description="0-based exclusive end character index")
    message: str = Field(..., description="Explanation of the policy violation")
    suggested_fix: str = Field(..., description="Compliant replacement phrase")

class AtomicClaimAudit(BaseModel):
    claim_id: str = Field(..., description="Sequential ID e.g. CLAIM-001")
    claim_text: str = Field(..., description="Normalized atomic factual assertion")
    original_span: str = Field(..., description="Exact verbatim substring from input text")
    start_char: int = Field(..., ge=-1, description="Start index in input text, or -1 if not found")
    end_char: int = Field(..., ge=-1, description="End index in input text, or -1 if not found")
    verdict: ClaimVerdict
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    citation_source: Optional[str] = Field(default=None, description="Format: doc_title#section_ref")
    retrieved_excerpt: Optional[str] = Field(default=None, description="Verbatim chunk content from KB")
    similarity_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    explanation: str = Field(..., description="Why the claim is verified, contradicted, or ungrounded")
    suggested_remediation: Optional[str] = Field(default=None, description="Rewritten original_span grounded in KB")

class AuditRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="Draft content to audit")
    doc_type: str = Field(default="general", pattern="^(general|fintech_promo|saas_sla|press_release)$")
    run_stage2_if_stage1_blocked: bool = Field(default=True)

class Stage1AuditResponse(BaseModel):
    passed: bool
    blocker_count: int = Field(..., ge=0)
    warning_count: int = Field(..., ge=0)
    violations: List[RuleViolation]
    stage1_latency_ms: float = Field(..., ge=0.0)

class FullAuditResponse(BaseModel):
    governance_state: GovernanceState
    stage1_passed: bool
    stage2_passed: bool
    overall_compliant: bool
    hallucination_risk_score: float = Field(..., ge=0.0, le=100.0)
    stage1_latency_ms: float = Field(..., ge=0.0)
    stage2_latency_ms: float = Field(..., ge=0.0)
    total_latency_ms: float = Field(..., ge=0.0)
    rule_violations: List[RuleViolation]
    claim_audits: List[AtomicClaimAudit]

class KnowledgeChunkItem(BaseModel):
    chunk_id: str
    doc_title: str
    section_ref: str
    category: str
    content: str

class KnowledgeBaseResponse(BaseModel):
    total_chunks: int
    chunks: List[KnowledgeChunkItem]

class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None

