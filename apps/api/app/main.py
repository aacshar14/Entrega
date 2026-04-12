from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.middleware import ObservabilityMiddleware

# Immediate startup signal for Cloud Run logging
print(f"DEBUG: Entrypoint reached at {time.ctime()} (UTC)")

from app.core.config import settings
from app.core.logging import setup_logging, logger

# 🛡️ Hardening: Ensure logging is initialized first
setup_logging()


# Delayed import of api_router to prevent top-level circular crashes
def get_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=f"Backend for {settings.PROJECT_NAME} delivery and inventory management.",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        redirect_slashes=True,
    )

    # Setup Rate Limiting
    from app.core.limiter import limiter

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Enable Proxy Headers (Essential for Cloud Run HTTPS redirects)
    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

    # Add Observability Middleware
    app.add_middleware(ObservabilityMiddleware)

    # Include CORSMiddleware
    # 🛡️ Hardening: Browsers forbid allow_origins=["*"] when allow_credentials=True.
    # We must explicitly list the authorized origins to allow the Authorization header.
    authorized_origins = [
        "https://entrega.space",
        "https://www.entrega.space",
        "https://entregaspace.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=authorized_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API Router (Lazy load to break circularity)
    from app.api.v1.api import api_router

    app.include_router(api_router, prefix=settings.API_V1_STR)

    # 🔗 Root Webhook Gateway (Required for Meta standard compliance)
    from app.api.v1.endpoints import webhooks

    app.include_router(webhooks.router, prefix="/webhook", tags=["webhooks-gateway"])

    return app


app = get_application()


@app.on_event("startup")
async def check_rls_hardening():
    """
    Optional Security Guard: Verifies that critical tables have RLS enabled at startup.
    This ensures that the 'deny-by-default' policy for PostgREST is active.
    """
    from app.core.db import engine
    from sqlalchemy import text
    from app.core.logging import logger

    critical_tables = ("users", "tenants", "notifications", "audit_logs")
    query = text("""
        SELECT relname 
        FROM pg_class 
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE relname IN :tables AND relrowsecurity = false AND pg_namespace.nspname = 'public';
    """)

    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"tables": critical_tables}).fetchall()
            if result:
                vulnerable = [r[0] for r in result]
                logger.error(
                    "SECURITY WARNING: Row-Level Security (RLS) is DISABLED on critical tables!",
                    vulnerable_tables=vulnerable,
                    action_required="Apply Alembic migration v1_6_5 to ENABLE RLS immediately.",
                )
            else:
                logger.info("SECURITY AUDIT: RLS is verified on all critical tables.")
    except Exception as e:
        logger.warning("SECURITY AUDIT: Could not verify RLS state", error=str(e))


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
                <span style="color: var(--accent);">Entré</span>GA
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
