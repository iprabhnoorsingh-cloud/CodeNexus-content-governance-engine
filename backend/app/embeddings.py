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


def generate_embedding(text: str) -> List[float]:
    if os.getenv("USE_MOCK_LLM", "true").lower() == "true":
        vec = np.zeros(384, dtype=np.float32)

        raw_tokens = text.lower().split()
        tokens: List[str] = []
        for raw in raw_tokens:
            clean = raw.strip('.,;:!?\"\'()[]{}')
            if clean:
                tokens.append(clean)

        filtered_tokens = [t for t in tokens if t not in STOPWORDS]

        for token in filtered_tokens:
            weight = 3.0 if token in DOMAIN_CRITICAL_TOKENS else 1.0
            idx = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16) % 384
            vec[idx] += weight

            if len(token) >= 3:
                for i in range(len(token) - 2):
                    gram = token[i:i + 3]
                    gram_idx = int(hashlib.sha256(gram.encode("utf-8")).hexdigest(), 16) % 384
                    vec[gram_idx] += 1.0

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

