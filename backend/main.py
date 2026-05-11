from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.leads import router as leads_router
from app.api.ai import router as ai_router
from app.api.stats import router as stats_router
from app.core.auth import require_auth
from app.core.database import DatabaseConfigurationError, get_db_client
from app.core.settings import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI-powered Lead Generation & CRM Platform",
    version="1.0.0",
)


@app.exception_handler(DatabaseConfigurationError)
async def database_configuration_error_handler(_: Request, exc: DatabaseConfigurationError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix="/api")
app.include_router(leads_router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(ai_router, prefix="/api", dependencies=[Depends(require_auth)])
app.include_router(stats_router, prefix="/api", dependencies=[Depends(require_auth)])


@app.get("/")
async def root():
    return {
        "app": "LeadFlow AI",
        "version": "1.0.0",
        "status": "operational",
        "environment": settings.environment,
        "gemini_model": settings.gemini_model,
        "database": "supabase",
    }


@app.get("/health")
async def health():
    try:
        get_db_client()
        return {"status": "healthy", "database": "connected"}
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
