from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.schemas import AuditRequest, Stage1AuditResponse, ErrorResponse, KnowledgeBaseResponse
from app.stage1_rules import run_stage1_audit
from app.database import get_all_kb_chunks

app = FastAPI(title="GHOST Enterprise Content Governance Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error_code="INTERNAL_SERVER_ERROR",
            message=str(exc),
        ).model_dump(),
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ghost-governance-engine"}


@app.post("/api/v1/audit/stage1", response_model=Stage1AuditResponse)
async def audit_stage1(request: AuditRequest):
    return run_stage1_audit(request.text)


@app.get("/api/v1/kb/chunks", response_model=KnowledgeBaseResponse)
async def get_kb_chunks():
    chunks = get_all_kb_chunks()
    return KnowledgeBaseResponse(total_chunks=len(chunks), chunks=chunks)

