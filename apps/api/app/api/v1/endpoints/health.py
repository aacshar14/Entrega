from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from sqlmodel import Session, text
from app.core.db import get_session
from app.core.config import settings
import time

router = APIRouter()

@router.get("/ready")
async def readiness_check(db: Session = Depends(get_session)):
    """Validates that the database is reachable and accepting connections."""
    try:
        db.exec(text("SELECT 1")).one()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {str(e)}")

@router.get("/", status_code=200)
async def health_check(request: Request):
    """General health status of the application. Branded for browsers."""
    
    # Standard health data
    health_data = {
        "status": "healthy",
        "version": settings.VERSION,
        "name": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

    # Content negotiation: If they want HTML (browser), give them a branded page
    accept_header = request.headers.get("Accept", "")
    if "text/html" in accept_header:
        # Use official brand colors: Slate 950 and Blue 500
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Health Status | {settings.PROJECT_NAME}</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                :root {{
                    --primary: #0f172a;
                    --accent: #3b82f6;
                    --success: #22c55e;
                }}
                body {{
                    margin: 0;
                    padding: 0;
                    font-family: 'Outfit', sans-serif;
                    background: radial-gradient(circle at bottom left, #1e293b, #0f172a);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }}
                .glass {{
                    background: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 32px;
                    padding: 60px;
                    text-align: center;
                    max-width: 480px;
                    width: 90%;
                    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.6);
                    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }}
                @keyframes slideUp {{
                    from {{ opacity: 0; transform: translateY(40px) scale(0.95); }}
                    to {{ opacity: 1; transform: translateY(0) scale(1); }}
                }}
                .logo {{
                    font-size: 42px;
                    font-weight: 700;
                    letter-spacing: -1.5px;
                    margin-bottom: 32px;
                }}
                .status-badge {{
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(34, 197, 94, 0.15);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    padding: 8px 24px;
                    border-radius: 100px;
                    color: var(--success);
                    font-size: 15px;
                    font-weight: 700;
                    margin-bottom: 24px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }}
                .pulse {{
                    width: 10px;
                    height: 10px;
                    background: var(--success);
                    border-radius: 50%;
                    box-shadow: 0 0 15px var(--success);
                    animation: pulse 2s infinite;
                }}
                @keyframes pulse {{
                    0% {{ transform: scale(1); opacity: 1; }}
                    50% {{ transform: scale(1.5); opacity: 0.5; }}
                    100% {{ transform: scale(1); opacity: 1; }}
                }}
                h1 {{ margin: 0; font-size: 20px; color: #f8fafc; font-weight: 400; opacity: 0.8; }}
                .version {{ font-family: monospace; opacity: 0.5; margin-top: 8px; font-size: 14px; }}
                .grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-top: 40px;
                    text-align: left;
                }}
                .card {{
                    background: rgba(255,255,255,0.03);
                    padding: 16px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.05);
                }}
                .card-label {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }}
                .card-value {{ font-size: 14px; margin-top: 4px; font-weight: 600; color: #cbd5e1; }}
                .footer {{
                    margin-top: 40px;
                    font-size: 13px;
                    color: #475569;
                }}
            </style>
        </head>
        <body>
            <div class="glass">
                <div class="logo">
                    <span style="color: var(--accent);">Entré</span>GA
                </div>
                <div class="status-badge">
                    <div class="pulse"></div>
                    SISTEMA OPERATIVO
                </div>
                <h1>{settings.PROJECT_NAME} API Engine</h1>
                <div class="version">v{settings.VERSION}</div>
                
                <div class="grid">
                    <div class="card">
                        <div class="card-label">Estado</div>
                        <div class="card-value">Saludable</div>
                    </div>
                    <div class="card">
                        <div class="card-label">Entorno</div>
                        <div class="card-value">{settings.ENVIRONMENT.upper()}</div>
                    </div>
                </div>

                <div class="footer">
                    Infraestructura monitoreada en tiempo real<br>
                    &copy; {time.strftime('%Y')} EntréGA Platform
                </div>
            </div>
        </body>
        </html>
        """)
    
    # Return JSON for API calls
    return JSONResponse(content=health_data)
