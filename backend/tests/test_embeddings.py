import os
import unittest
from unittest.mock import patch, MagicMock
import numpy as np
from app.embeddings import generate_embedding, STOPWORDS, DOMAIN_CRITICAL_TOKENS


class TestEmbeddings(unittest.TestCase):
    def test_mock_embedding_shape_and_norm(self):
        text = "AcmeCloud Enterprise SLA guarantees 99.9% monthly uptime availability."
        vec = generate_embedding(text)
        self.assertEqual(len(vec), 384)
        norm = np.linalg.norm(vec)
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_mock_embedding_determinism(self):
        text = "The core platform backend is built using Python 3.11 with FastAPI."
        vec1 = generate_embedding(text)
        vec2 = generate_embedding(text)
        self.assertEqual(vec1, vec2)

    def test_mock_embedding_empty_text(self):
        vec = generate_embedding("")
        self.assertEqual(len(vec), 384)
        self.assertEqual(sum(vec), 0.0)

    def test_mock_embedding_domain_tokens_boost(self):
        # A text with domain critical tokens should have non-zero elements
        vec = generate_embedding("soc2 aes-256 99.9% uptime")
        self.assertEqual(len(vec), 384)
        self.assertAlmostEqual(np.linalg.norm(vec), 1.0, places=4)

    @patch.dict(os.environ, {"USE_MOCK_LLM": "false", "OPENAI_API_KEY": "test-key"})
    @patch("openai.OpenAI")
    def test_openai_embedding(self, mock_openai_cls):
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_resp = MagicMock()
        dummy_embedding = [0.05] * 384
        mock_resp.data = [MagicMock(embedding=dummy_embedding)]
        mock_client.embeddings.create.return_value = mock_resp

        result = generate_embedding("test text")
        self.assertEqual(result, dummy_embedding)
        mock_client.embeddings.create.assert_called_once_with(
            input="test text",
            model="text-embedding-3-small",
            dimensions=384,
        )

