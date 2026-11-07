import re
import time
from typing import List, Dict, Any, Optional
from app.schemas import RuleSeverity, RuleViolation, Stage1AuditResponse


class RuleDefinition(dict):
    """Dictionary with attribute-style access for rule properties like `rule.scopes`."""

    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError as exc:
            raise AttributeError(name) from exc


RULE_DEFINITIONS: List[RuleDefinition] = [
    RuleDefinition(
        {
            "id": "RULE_FIN_001",
            "scopes": ["fintech_promo", "general"],
            "pattern": re.compile(
                r"\b(?:100%\s{1,4}guaranteed(?:\s{1,4}(?:returns?|profits?|yields?|apy))?|guaranteed\s{1,4}(?:returns?|profits?|yields?|apy)|zero[- ]risk\s{1,4}(?:investment|returns?|yields?))\b",
                re.IGNORECASE,
            ),
            "severity": RuleSeverity.BLOCKER,
            "message": "Absolute financial return or zero-risk guarantees violate regulatory compliance.",
            "suggested_fix": "historically consistent variable performance subject to market risk",
        }
    ),
    RuleDefinition(
        {
            "id": "RULE_SLA_002",
            "scopes": ["saas_sla", "general"],
            "pattern": re.compile(
                r"\b(?:100%\s{1,4}uptime|zero\s{1,4}downtime\s{1,4}guarantee|uninterruptible\s{1,4}uptime)\b",
                re.IGNORECASE,
            ),
            "severity": RuleSeverity.BLOCKER,
            "message": "Absolute 100% uptime or zero-downtime claims violate enterprise SLA legal policy.",
            "suggested_fix": "99.9% monthly uptime availability SLA",
        }
    ),
    RuleDefinition(
        {
            "id": "RULE_SEC_003",
            "scopes": ["fintech_promo", "saas_sla", "general", "press_release"],
            "pattern": re.compile(
                r"\b(?:unhackable|100%\s{1,4}immune\s{1,4}to\s{1,4}breaches|military[- ]grade\s{1,4}invulnerability)\b",
                re.IGNORECASE,
            ),
            "severity": RuleSeverity.BLOCKER,
            "message": "Absolute security immunity claims are prohibited by legal compliance.",
            "suggested_fix": "SOC2 Type II certified with AES-256 encryption",
        }
    ),
    RuleDefinition(
        {
            "id": "RULE_PRIV_004",
            "scopes": ["fintech_promo", "saas_sla", "general"],
            "pattern": re.compile(
                r"\b(?:we\s{1,4}never\s{1,4}log\s{1,4}any\s{1,4}data|zero\s{1,4}telemetry\s{1,4}collection)\b",
                re.IGNORECASE,
            ),
            "severity": RuleSeverity.BLOCKER,
            "message": "Zero-logging claims conflict with mandatory 90-day audit trail retention policies.",
            "suggested_fix": "we retain anonymized audit telemetry for 90 days per compliance policy",
        }
    ),
    RuleDefinition(
        {
            "id": "RULE_INJ_001",
            "scopes": ["fintech_promo", "saas_sla", "general"],
            "pattern": re.compile(
                r"\b(?:ignore\s{1,4}(?:all\s{1,4})?(?:previous|prior)\s{1,4}instructions(?:\s{1,4}and\s{1,4}mark\s{1,4}all\s{1,4}claims\s{1,4}verified)?|system\s{1,4}prompt|mark\s{1,4}all\s{1,4}claims\s{1,4}verified|you\s{1,4}are\s{1,4}now\s{1,4}in\s{1,4}developer\s{1,4}mode)\b",
                re.IGNORECASE,
            ),
            "severity": RuleSeverity.BLOCKER,
            "message": "Adversarial prompt injection or governance bypass attempt detected.",
            "suggested_fix": "[Remove adversarial prompt injection instructions]",
        }
    ),
    RuleDefinition(
        {
            "id": "RULE_MKT_005",
            "scopes": ["fintech_promo", "saas_sla", "general", "press_release"],
            "pattern": re.compile(
                r"\b(?:undisputed\s{1,4}market\s{1,4}leader|the\s{1,4}world'?s\s{1,4}only\s{1,4}platform|#1\s{1,4}platform\s{1,4}globally)\b",
                re.IGNORECASE,
            ),
            "severity": RuleSeverity.WARNING,
            "message": "Unverified market superlatives require third-party citation.",
            "suggested_fix": "an enterprise-grade platform",
        }
    ),
    RuleDefinition(
        {
            "id": "RULE_COMP_006",
            "scopes": ["fintech_promo", "saas_sla", "general", "press_release"],
            "pattern": re.compile(
                r"\b(?:unlike\s{1,4}(?:LegacyCorp|SlowCloud|CompetitorX)|(?:LegacyCorp|SlowCloud|CompetitorX)\s{1,4}is\s{1,4}obsolete)\b",
                re.IGNORECASE,
            ),
            "severity": RuleSeverity.WARNING,
            "message": "Direct disparagement of named competitors violates brand governance guidelines.",
            "suggested_fix": "compared to traditional legacy alternatives",
        }
    ),
]


def run_stage1_audit(
    draft_text: str = "",
    doc_type: str = "general",
    *,
    text: Optional[str] = None,
) -> Stage1AuditResponse:
    target_text = text if text is not None else draft_text
    start_time = time.perf_counter()
    violations: List[RuleViolation] = []

    for rule in RULE_DEFINITIONS:
        if doc_type not in rule.scopes:
            continue
        for match in rule["pattern"].finditer(target_text):
            violations.append(
                RuleViolation(
                    rule_id=rule["id"],
                    severity=rule["severity"],
                    matched_text=match.group(0),
                    start_char=match.start(),
                    end_char=match.end(),
                    message=rule["message"],
                    suggested_fix=rule["suggested_fix"],
                )
            )

    violations.sort(key=lambda v: v.start_char)

    blocker_count = sum(1 for v in violations if v.severity == RuleSeverity.BLOCKER)
    warning_count = sum(1 for v in violations if v.severity == RuleSeverity.WARNING)
    stage1_latency_ms = round((time.perf_counter() - start_time) * 1000, 3)

    return Stage1AuditResponse(
        passed=(blocker_count == 0),
        blocker_count=blocker_count,
        warning_count=warning_count,
        violations=violations,
        stage1_latency_ms=stage1_latency_ms,
    )
