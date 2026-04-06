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
    
    health_data = {
        "status": "healthy",
        "version": settings.VERSION,
        "name": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

    accept_header = request.headers.get("Accept", "")
    if "text/html" in accept_header:
        # Using official colors: Light background (#e5e9ef), Dark Navy card (#1c2d3d), and Cyan accent (#5dd3f3)
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
                    --bg-page: #e5e9ef;
                    --bg-card: #1c2d3d;
                    --accent: #5dd3f3;
                    --text-main: #ffffff;
                    --text-muted: #94a3b8;
                    --success: #22c55e;
                }}
                body {{
                    margin: 0;
                    padding: 0;
                    font-family: 'Outfit', sans-serif;
                    background-color: var(--bg-page);
                    color: var(--text-main);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }}
                .glass {{
                    background: var(--bg-card);
                    border-radius: 40px;
                    padding: 60px;
                    text-align: center;
                    max-width: 480px;
                    width: 90%;
                    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                }}
                @keyframes slideUp {{
                    from {{ opacity: 0; transform: translateY(40px) scale(0.95); }}
                    to {{ opacity: 1; transform: translateY(0) scale(1); }}
                }}
                .logo-container {{
                    margin-bottom: 40px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }}
                .logo-text {{
                    font-size: 48px;
                    font-weight: 700;
                    letter-spacing: -2px;
                }}
                .arrow {{
                    color: var(--accent);
                }}
                .status-badge {{
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 8px 24px;
                    border-radius: 100px;
                    color: var(--text-main);
                    font-size: 13px;
                    font-weight: 700;
                    margin-bottom: 24px;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    background: rgba(255, 255, 255, 0.05);
                }}
                .pulse {{
                    width: 10px;
                    height: 10px;
                    background: var(--accent);
                    border-radius: 50%;
                    box-shadow: 0 0 15px var(--accent);
                    animation: pulse 2s infinite;
                }}
                @keyframes pulse {{
                    0% {{ transform: scale(1); opacity: 1; }}
                    50% {{ transform: scale(1.5); opacity: 0.5; }}
                    100% {{ transform: scale(1); opacity: 1; }}
                }}
                h1 {{ 
                    margin: 0; 
                    font-size: 18px; 
                    color: var(--text-muted); 
                    font-weight: 500; 
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }}
                .grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 48px;
                    text-align: left;
                }}
                .card {{
                    background: rgba(255,255,255,0.03);
                    padding: 20px;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.05);
                }}
                .card-label {{ font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }}
                .card-value {{ font-size: 15px; margin-top: 6px; font-weight: 600; color: var(--text-main); }}
                .footer {{
                    margin-top: 60px;
                    font-size: 13px;
                    color: var(--text-muted);
                    opacity: 0.6;
                }}
            </style>
        </head>
        <body>
            <div class="glass">
                <div class="logo-container">
                    <div class="logo-text">
                        <span class="arrow">E</span>ntrega
                    </div>
                </div>
                <div class="status-badge">
                    <div class="pulse"></div>
                    SISTEMA OPERATIVO
                </div>
                <h1>Health Monitor Engine</h1>
                
                <div class="grid">
                    <div class="card">
                        <div class="card-label">Version</div>
                        <div class="card-value">v{settings.VERSION}</div>
                    </div>
                    <div class="card">
                        <div class="card-label">Entorno</div>
                        <div class="card-value">{settings.ENVIRONMENT.upper()}</div>
                    </div>
                </div>

                <div class="footer">
                    © {time.strftime('%Y')} Entrega Platform • Logistic Intelligence
                </div>
            </div>
        </body>
        </html>
        """)
    
    return JSONResponse(content=health_data)
