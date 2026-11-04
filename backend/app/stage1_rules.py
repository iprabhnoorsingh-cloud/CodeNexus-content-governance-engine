import re
import time
from typing import List, Dict, Any
from app.schemas import RuleSeverity, RuleViolation, Stage1AuditResponse

RULE_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "id": "RULE_FIN_001",
        "pattern": re.compile(
            r"\b(?:100%\s{1,4}guaranteed|guaranteed\s{1,4}(?:returns?|profits?|yields?|apy)|zero[- ]risk\s{1,4}(?:investment|returns?|yields?))\b",
            re.IGNORECASE,
        ),
        "severity": RuleSeverity.BLOCKER,
        "message": "Absolute financial return or zero-risk guarantees violate regulatory compliance.",
        "suggested_fix": "historically consistent variable performance subject to market risk",
    },
    {
        "id": "RULE_SLA_002",
        "pattern": re.compile(
            r"\b(?:100%\s{1,4}uptime|zero\s{1,4}downtime\s{1,4}guarantee|uninterruptible\s{1,4}uptime)\b",
            re.IGNORECASE,
        ),
        "severity": RuleSeverity.BLOCKER,
        "message": "Absolute 100% uptime or zero-downtime claims violate enterprise SLA legal policy.",
        "suggested_fix": "99.9% monthly uptime availability SLA",
    },
    {
        "id": "RULE_SEC_003",
        "pattern": re.compile(
            r"\b(?:unhackable|100%\s{1,4}immune\s{1,4}to\s{1,4}breaches|military[- ]grade\s{1,4}invulnerability)\b",
            re.IGNORECASE,
        ),
        "severity": RuleSeverity.BLOCKER,
        "message": "Absolute security immunity claims are prohibited by legal compliance.",
        "suggested_fix": "SOC2 Type II certified with AES-256 encryption",
    },
    {
        "id": "RULE_PRIV_004",
        "pattern": re.compile(
            r"\b(?:we\s{1,4}never\s{1,4}log\s{1,4}any\s{1,4}data|zero\s{1,4}telemetry\s{1,4}collection)\b",
            re.IGNORECASE,
        ),
        "severity": RuleSeverity.BLOCKER,
        "message": "Zero-logging claims conflict with mandatory 90-day audit trail retention policies.",
        "suggested_fix": "we retain anonymized audit telemetry for 90 days per compliance policy",
    },
    {
        "id": "RULE_MKT_005",
        "pattern": re.compile(
            r"\b(?:undisputed\s{1,4}market\s{1,4}leader|the\s{1,4}world'?s\s{1,4}only\s{1,4}platform|#1\s{1,4}platform\s{1,4}globally)\b",
            re.IGNORECASE,
        ),
        "severity": RuleSeverity.WARNING,
        "message": "Unverified market superlatives require third-party citation.",
        "suggested_fix": "an enterprise-grade platform",
    },
    {
        "id": "RULE_COMP_006",
        "pattern": re.compile(
            r"\b(?:unlike\s{1,4}(?:LegacyCorp|SlowCloud|CompetitorX)|(?:LegacyCorp|SlowCloud|CompetitorX)\s{1,4}is\s{1,4}obsolete)\b",
            re.IGNORECASE,
        ),
        "severity": RuleSeverity.WARNING,
        "message": "Direct disparagement of named competitors violates brand governance guidelines.",
        "suggested_fix": "compared to traditional legacy alternatives",
    },
]


def run_stage1_audit(text: str) -> Stage1AuditResponse:
    start_time = time.perf_counter()
    violations: List[RuleViolation] = []

    for rule in RULE_DEFINITIONS:
        for match in rule["pattern"].finditer(text):
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

