from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.middleware import ObservabilityMiddleware

# Immediate startup signal for Cloud Run logging
print(f"DEBUG: Entrypoint reached at {time.ctime()} (UTC)")

from app.api.v1.api import api_router

from app.core.config import settings
from app.core.logging import setup_logging, logger

# Setup structured logging
setup_logging()

# Setup Rate Limiting
from app.core.limiter import limiter

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=f"Backend for {settings.PROJECT_NAME} delivery and inventory management.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    redirect_slashes=False
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add Observability Middleware
app.add_middleware(ObservabilityMiddleware)

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
    
    return response

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
async def root():
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{settings.PROJECT_NAME} API v{settings.VERSION}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --primary: #0f172a;
                --accent: #3b82f6;
                --success: #22c55e;
            }}
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Inter', sans-serif;
                background: radial-gradient(circle at top right, #1e293b, #0f172a);
                color: white;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }}
            .glass {{
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 48px;
                text-align: center;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                animation: fadeIn 0.8s ease-out;
            }}
            @keyframes fadeIn {{
                from {{ opacity: 0; transform: translateY(20px); }}
                to {{ opacity: 1; transform: translateY(0); }}
            }}
            .logo {{
                font-size: 32px;
                font-weight: 700;
                letter-spacing: -1px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }}
            .logo svg {{ width: 40px; height: 40px; fill: var(--accent); }}
            .status-container {{
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: rgba(34, 197, 94, 0.1);
                padding: 6px 16px;
                border-radius: 100px;
                color: var(--success);
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 24px;
            }}
            .pulse {{
                width: 8px;
                height: 8px;
                background: var(--success);
                border-radius: 50%;
                box-shadow: 0 0 0 rgba(34, 197, 94, 0.4);
                animation: pulse 2s infinite;
            }}
            @keyframes pulse {{
                0% {{ box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }}
                70% {{ box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }}
                100% {{ box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }}
            }}
            h1 {{ margin: 0; font-size: 24px; color: #f8fafc; }}
            p {{ color: #94a3b8; line-height: 1.6; margin: 16px 0 32px 0; }}
            .btn {{
                display: block;
                background: var(--accent);
                color: white;
                text-decoration: none;
                padding: 14px;
                border-radius: 12px;
                font-weight: 600;
                transition: all 0.2s;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }}
            .btn:hover {{
                background: #2563eb;
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
            }}
            .footer {{
                margin-top: 32px;
                font-size: 12px;
                color: #475569;
                font-weight: 500;
            }}
        </style>
    </head>
    <body>
        <div class="glass">
            <div class="status-container">
                <div class="pulse"></div>
                SISTEMA OPERATIVO
            </div>
            <div class="logo">
                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                {settings.PROJECT_NAME}
            </div>
            <h1>Version {settings.VERSION}</h1>
            <p>Infraestructura escalable de logística y gestión de inventario. El motor de tu negocio en tiempo real.</p>
            <a href="/docs" class="btn">Explorar Documentación API</a>
            <div class="footer">
                &copy; {time.strftime('%Y')} {settings.PROJECT_NAME} • {settings.ENVIRONMENT.upper()}
            </div>
        </div>
    </body>
    </html>
    """
