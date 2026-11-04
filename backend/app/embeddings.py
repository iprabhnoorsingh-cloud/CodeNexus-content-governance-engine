import os
import hashlib
from typing import List
import numpy as np

STOPWORDS = {
    "the", "a", "an", "is", "are", "our", "we", "to", "in", "of",
    "and", "with", "for", "on", "by", "at", "from"
}

DOMAIN_CRITICAL_TOKENS = {
    "99.9%", "uptime", "sla", "credit", "python", "fastapi", "rust",
    "nextjs", "12,000", "rps", "latency", "soc2", "aes-256", "90",
    "days", "telemetry", "4.75%", "apy", "yield", "t+1", "50,000", "settlement"
}

SEMANTIC_CLUSTERS = {
    "cluster_sla_uptime": {
        "sla", "uptime", "availability", "99.9%", "99.99%", "99.999%",
        "maintenance", "windows", "48", "24", "notice", "regions", "downtime"
    },
    "cluster_sla_credit": {
        "credit", "credits", "10%", "30%", "50%", "falls", "below",
        "99.0%", "entitles", "refund", "service"
    },
    "cluster_tech_stack": {
        "backend", "platform", "core", "built", "python", "fastapi",
        "postgresql", "pgvector", "nextjs", "next.js", "typescript",
        "rust", "go", "golang", "mongodb", "angular", "web", "client"
    },
    "cluster_perf_rps": {
        "ingestion", "gateway", "sustains", "12,000", "50,000", "100,000",
        "rps", "requests", "cluster", "node", "p95", "latency", "45",
        "45ms", "5ms", "milliseconds"
    },
    "cluster_sec_cert": {
        "soc2", "iso", "27001", "certified", "encrypted", "encryption",
        "rest", "aes-256", "aes-512", "transit", "tls", "fedramp", "hipaa"
    },
    "cluster_priv_logs": {
        "pii", "never", "train", "foundational", "models", "audit",
        "telemetry", "logs", "retained", "retention", "90", "30", "days",
        "cold", "storage", "regulatory"
    },
    "cluster_fin_apy": {
        "treasury", "reserve", "account", "offers", "variable", "annual",
        "percentage", "yield", "yields", "apy", "4.75%", "8%", "10%",
        "12%", "returns", "guaranteed", "central", "bank", "fixed"
    },
    "cluster_fin_settle": {
        "institutional", "settlement", "transfers", "clear", "t+1", "t+0",
        "neft", "rtgs", "neft/rtgs", "instant", "capped", "50,000",
        "transaction", "0.25%", "processing", "fee", "unlimited"
    },
}


def generate_embedding(text: str) -> List[float]:
    if os.getenv("USE_MOCK_LLM", "true").lower() == "true":
        vec = np.zeros(384, dtype=np.float32)

        raw_tokens = text.lower().split()
        tokens: List[str] = []
        for raw in raw_tokens:
            clean = raw.strip('.,;:!?\"\'()[]{}$')
            if clean:
                tokens.append(clean)

        filtered_tokens = [t for t in tokens if t not in STOPWORDS]

        for token in filtered_tokens:
            weight = 3.0 if token in DOMAIN_CRITICAL_TOKENS else 1.0
            idx = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16) % 384
            vec[idx] += weight

            for cluster_name, cluster_words in SEMANTIC_CLUSTERS.items():
                if token in cluster_words:
                    c_idx = int(hashlib.sha256(cluster_name.encode("utf-8")).hexdigest(), 16) % 384
                    vec[c_idx] += weight * 1.5

            if len(token) >= 3:
                for i in range(len(token) - 2):
                    gram = token[i:i + 3]
                    gram_idx = int(hashlib.sha256(gram.encode("utf-8")).hexdigest(), 16) % 384
                    vec[gram_idx] += 0.25

        norm = float(np.linalg.norm(vec))
        if norm > 0.0:
            vec = vec / norm

        return vec.tolist()

    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small",
        dimensions=384,
    )
    return response.data[0].embedding
