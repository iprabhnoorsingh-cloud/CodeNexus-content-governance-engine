import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.schemas import KnowledgeChunkItem
from app.seed_kb import seed_knowledge_base, RAW_CHUNKS
from app.database import retrieve_top_k_chunks, get_all_kb_chunks


class TestDatabaseAndAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.main.get_all_kb_chunks")
    def test_get_kb_chunks_api(self, mock_get_all):
        mock_chunks = [
            KnowledgeChunkItem(
                chunk_id="KB-001",
                doc_title="sla_policy_2026.md",
                section_ref="sec-1.1",
                category="infrastructure",
                content="AcmeCloud Enterprise SLA guarantees 99.9% monthly uptime availability across all production regions.",
            ),
            KnowledgeChunkItem(
                chunk_id="KB-002",
                doc_title="sla_policy_2026.md",
                section_ref="sec-2.4",
                category="infrastructure",
                content="In the event monthly uptime falls below 99.9%, customers receive a 10% service credit.",
            ),
        ]
        mock_get_all.return_value = mock_chunks

        response = self.client.get("/api/v1/kb/chunks")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_chunks"], 2)
        self.assertEqual(len(data["chunks"]), 2)
        self.assertEqual(data["chunks"][0]["chunk_id"], "KB-001")
        self.assertEqual(data["chunks"][1]["chunk_id"], "KB-002")

    @patch("app.seed_kb.init_db")
    @patch("app.seed_kb.SessionLocal")
    def test_seed_knowledge_base(self, mock_session_local, mock_init_db):
        mock_session = MagicMock()
        mock_session_local.return_value.__enter__.return_value = mock_session

        count = seed_knowledge_base()

        self.assertEqual(count, 8)
        self.assertEqual(len(RAW_CHUNKS), 8)
        mock_init_db.assert_called_once()
        self.assertEqual(mock_session.merge.call_count, 8)
        mock_session.commit.assert_called_once()

    @patch("app.database.SessionLocal")
    def test_retrieve_top_k_chunks(self, mock_session_local):
        mock_session = MagicMock()
        mock_session_local.return_value.__enter__.return_value = mock_session

        mock_chunk = MagicMock()
        mock_chunk.chunk_id = "KB-001"
        mock_chunk.doc_title = "sla_policy_2026.md"
        mock_chunk.section_ref = "sec-1.1"
        mock_chunk.category = "infrastructure"
        mock_chunk.content = "AcmeCloud Enterprise SLA guarantees 99.9% monthly uptime availability."

        mock_result = [(mock_chunk, 0.85234)]
        mock_session.execute.return_value.all.return_value = mock_result

        results = retrieve_top_k_chunks("99.9% uptime guarantees", k=3, min_similarity=0.45)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["chunk_id"], "KB-001")
        self.assertEqual(results[0]["citation_source"], "sla_policy_2026.md#sec-1.1")
        self.assertEqual(results[0]["similarity_score"], 0.8523)

