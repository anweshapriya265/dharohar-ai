from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.routers import documents, search, records
from app.services.embedding_service import embedding_service
from app.services.ocr_service import is_tesseract_available


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directory and SQLite schema are initialized
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    # Auto-seed authentic IITGN Explorer records if database is fresh
    try:
        records.seed_heritage_records()
    except Exception as exc:
        pass
    yield


app = FastAPI(
    title="DHAROHAR AI API",
    description="Backend API for Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives",
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS configuration allowing local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Document ingestion & management router
app.include_router(documents.router)
# Milestone 3: Semantic search router
app.include_router(search.router)
# SRS Platform: Heritage records, review workflow, and geospatial map router
app.include_router(records.router)


@app.get("/")
def read_root():
    return {
        "name": "DHAROHAR AI",
        "tagline": "Digital Revitalisation of Unstructured Cultural & Architectural Heritage Archives",
        "organization": "Blithchron '27, IIT Gandhinagar",
        "problem_statement": "HC26-CULT01",
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "records_url": "/api/records",
        "map_records_url": "/api/map/records",
        "documents_url": "/api/documents",
        "search_url": "/api/search",
        "admin_dashboard": "/api/admin/dashboard",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "DHAROHAR AI Backend",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "api": "operational",
            "storage": "initialized",
            "pdf_extraction": "pymupdf_ready",
            "semantic_search": "sentence_transformers_ready" if embedding_service.is_available() else "unavailable",
            "ocr": "tesseract_ready" if is_tesseract_available() else "tesseract_unavailable",
            "heritage_records": "active",
            "geospatial_map": "active",
        },
    }
