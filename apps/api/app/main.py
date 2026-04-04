from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

# Immediate startup signal for Cloud Run logging
print(f"DEBUG: Entrypoint reached at {time.ctime()} (UTC)")

from app.api.v1.api import api_router

from app.core.config import settings
from app.core.logging import setup_logging, logger

# Setup structured logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=f"Backend for {settings.PROJECT_NAME} delivery and inventory management.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    redirect_slashes=False
)

@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...", 
                environment=settings.ENVIRONMENT,
                project=settings.PROJECT_NAME,
                version=settings.VERSION)

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down...")

# Include CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://entrega.space",
        "https://app.entrega.space",
        "https://api.entrega.space",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    from fastapi.responses import JSONResponse
    logger.error("GLOBAL ERROR CAPTURED", 
                 path=request.url.path,
                 error=str(exc), 
                 trace=traceback.format_exc())
    
    response = JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "path": request.url.path
        }
    )
    
    # Manually add CORS headers for 500 responses 
    # to avoid masking the real error as a CORS block
    origin = request.headers.get("origin")
    if origin in [
        "http://localhost:3000",
        "https://entrega.space",
        "https://app.entrega.space"
    ]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        
    return response

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "domain": settings.DOMAIN,
        "docs": f"/docs"
    }
