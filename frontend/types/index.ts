export type RuleSeverity = "BLOCKER" | "WARNING";

export type ClaimVerdict = "VERIFIED" | "UNGROUNDED" | "CONTRADICTED";

export type GovernanceState =
  | "DRAFT"
  | "AUDITING"
  | "ACTION_REQUIRED"
  | "COMPLIANCE_APPROVED";

export interface RuleViolation {
  rule_id: string;
  severity: RuleSeverity;
  matched_text: string;
  start_char: number;
  end_char: number;
  message: string;
  suggested_fix: string;
}

export interface AtomicClaimAudit {
  claim_id: string;
  claim_text: string;
  original_span: string;
  start_char: number;
  end_char: number;
  verdict: ClaimVerdict;
  confidence_score: number;
  citation_source?: string | null;
  retrieved_excerpt?: string | null;
  similarity_score?: number | null;
  explanation: string;
  suggested_remediation?: string | null;
}

export interface FullAuditResponse {
  governance_state: GovernanceState;
  stage1_passed: boolean;
  stage2_passed: boolean;
  overall_compliant: boolean;
  hallucination_risk_score: number;
  stage1_latency_ms: number;
  stage2_latency_ms: number;
  total_latency_ms: number;
  rule_violations: RuleViolation[];
  claim_audits: AtomicClaimAudit[];
}

export interface KnowledgeChunkItem {
  chunk_id: string;
  doc_title: string;
  section_ref: string;
  category: string;
  content: string;
}

export interface KnowledgeBaseResponse {
  total_chunks: number;
  chunks: KnowledgeChunkItem[];
}

export interface AuditRequest {
  text: string;
  doc_type?: string;
  run_stage2_if_stage1_blocked?: boolean;
}

