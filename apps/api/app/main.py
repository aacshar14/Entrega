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
        title="EntréGA API",
        version="1.4.0",
        docs_url="/docs",
        redoc_url="/redoc",
        redirect_slashes=True,  # 🛡️ Hardening: Ensure standard slash behavior (V1.5.1)
    )

    # 🛡️ Global Identity & Dashboard Bridges (Absolute High Priority - V3.1.4)
    from app.api.v1.endpoints import users, dashboard
    
    @app.get("/me", response_model=None, tags=["identity-bridge"])
    @app.get("/me/", response_model=None, tags=["identity-bridge"])
    async def get_me_bridge(
        current_user: users.User = users.Depends(users.get_current_user),
        active_membership: users.Optional[users.TenantUser] = users.Depends(users.get_active_membership),
        db: users.Session = users.Depends(users.get_session),
    ):
        return await users.get_me(current_user, active_membership, db)

    app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard-gateway"])
    
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
        "https://app.entrega.space",
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

    app.include_router(webhooks.router, prefix="/webhook", tags=["webhooks-gateway"])

    # Include API Router (Lazy load to break circularity)
    from app.api.v1.api import api_router
    app.include_router(api_router, prefix=settings.API_V1_STR)

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
        <title>EntréGA Intelligence API</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
            :root {{
                --bg: #1D3146;
                --accent: #56CCF2;
                --text: #F8FAFC;
            }}
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Outfit', sans-serif;
                background: var(--bg);
                color: var(--text);
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }}
            .container {{
                text-align: center;
                animation: fadeIn 1s ease-out;
                max-width: 500px;
                padding: 40px;
            }}
            @keyframes fadeIn {{
                from {{ opacity: 0; transform: translateY(10px); }}
                to {{ opacity: 1; transform: translateY(0); }}
            }}
            .status-badge {{
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: rgba(86, 204, 242, 0.1);
                border: 1px solid rgba(86, 204, 242, 0.2);
                padding: 8px 16px;
                border-radius: 100px;
                color: var(--accent);
                font-size: 10px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.2em;
                margin-bottom: 32px;
            }}
            .pulse {{
                width: 6px;
                height: 6px;
                background: var(--accent);
                border-radius: 50%;
                animation: pulse 2s infinite;
            }}
            @keyframes pulse {{
                0% {{ box-shadow: 0 0 0 0 rgba(86, 204, 242, 0.7); opacity: 1; }}
                70% {{ box-shadow: 0 0 0 10px rgba(86, 204, 242, 0); opacity: 0.5; }}
                100% {{ box-shadow: 0 0 0 0 rgba(86, 204, 242, 0); opacity: 1; }}
            }}
            .logo {{
                font-size: 48px;
                font-weight: 900;
                letter-spacing: -2px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }}
            .logo span {{ color: var(--accent); font-style: italic; }}
            h1 {{ 
                margin: 0; 
                font-size: 14px; 
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.4em;
                color: var(--accent);
                opacity: 0.8;
                margin-bottom: 24px;
            }}
            p {{ 
                color: #94a3b8; 
                line-height: 1.6; 
                margin-bottom: 40px; 
                font-weight: 500;
                font-size: 15px;
            }}
            .btn {{
                display: inline-block;
                background: var(--accent);
                color: var(--bg);
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 16px;
                font-weight: 900;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.1em;
                transition: all 0.3s;
                box-shadow: 0 20px 40px -10px rgba(86, 204, 242, 0.3);
            }}
            .btn:hover {{
                transform: translateY(-2px) scale(1.02);
                box-shadow: 0 25px 50px -12px rgba(86, 204, 242, 0.4);
            }}
            .footer {{
                margin-top: 60px;
                font-size: 10px;
                color: #475569;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.2em;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status-badge">
                <div class="pulse"></div>
                Sincronizado
            </div>
            <div class="logo">
                Entré<span>GA</span>
            </div>
            <h1>Intelligence API v{settings.VERSION}</h1>
            <p>Infraestructura logística avanzada para la gestión de inventario y entregas en tiempo real.</p>
            <a href="/docs" class="btn">Explorar Contrato API</a>
            <div class="footer">
                &copy; {time.strftime('%Y')} EntréGA Technology • {settings.ENVIRONMENT.upper()}
            </div>
        </div>
    </body>
    </html>
    """
