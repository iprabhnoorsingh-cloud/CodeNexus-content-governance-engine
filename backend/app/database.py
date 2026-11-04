import os
from typing import List, Dict, Any
from sqlalchemy import create_engine, text, String, Text, select
from sqlalchemy.orm import declarative_base, sessionmaker, Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from app.schemas import KnowledgeChunkItem
from app.embeddings import generate_embedding

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://ghost_user:ghost_pass@localhost:5432/ghost_kb",
)
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.45"))

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    chunk_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    doc_title: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    section_ref: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[List[float]] = mapped_column(Vector(384), nullable=False)


def init_db() -> None:
    with SessionLocal() as session:
        session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        session.commit()
    Base.metadata.create_all(bind=engine)


def retrieve_top_k_chunks(
    query_text: str,
    k: int = 3,
    min_similarity: float = 0.45,
) -> List[Dict[str, Any]]:
    query_vec = generate_embedding(query_text)
    threshold = min_similarity if min_similarity is not None else SIMILARITY_THRESHOLD
    similarity_col = (1.0 - KnowledgeChunk.embedding.cosine_distance(query_vec)).label("similarity_score")

    with SessionLocal() as session:
        stmt = (
            select(KnowledgeChunk, similarity_col)
            .where(similarity_col >= threshold)
            .order_by(similarity_col.desc())
            .limit(k)
        )
        results = session.execute(stmt).all()
        chunks: List[Dict[str, Any]] = []
        for chunk, score in results:
            chunks.append({
                "chunk_id": chunk.chunk_id,
                "doc_title": chunk.doc_title,
                "section_ref": chunk.section_ref,
                "category": chunk.category,
                "content": chunk.content,
                "citation_source": f"{chunk.doc_title}#{chunk.section_ref}",
                "similarity_score": round(float(score), 4),
            })
        return chunks


def get_all_kb_chunks() -> List[KnowledgeChunkItem]:
    try:
        with SessionLocal() as session:
            stmt = select(KnowledgeChunk).order_by(KnowledgeChunk.chunk_id.asc())
            rows = session.scalars(stmt).all()
            if rows:
                return [
                    KnowledgeChunkItem(
                        chunk_id=row.chunk_id,
                        doc_title=row.doc_title,
                        section_ref=row.section_ref,
                        category=row.category,
                        content=row.content,
                    )
                    for row in rows
                ]
    except Exception:
        pass

    from app.seed_kb import RAW_CHUNKS

    return [
        KnowledgeChunkItem(
            chunk_id=chunk["chunk_id"],
            doc_title=chunk["doc_title"],
            section_ref=chunk["section_ref"],
            category=chunk["category"],
            content=chunk["content"],
        )
        for chunk in RAW_CHUNKS
    ]

