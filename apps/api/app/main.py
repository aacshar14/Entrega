from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging, logger

# Setup structured logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=f"Backend for {settings.PROJECT_NAME} delivery and inventory management.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
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

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "domain": settings.DOMAIN,
        "docs": f"/docs"
    }
