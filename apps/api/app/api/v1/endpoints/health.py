from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse
from app.core.config import settings
import time

router = APIRouter()

@router.get("/", status_code=200)
async def health_check(request: Request):
    # Detect if request is from a browser
    accept = request.headers.get("accept", "")
    
    if "text/html" in accept:
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{settings.PROJECT_NAME} Health v{settings.VERSION}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                :root {{ --primary: #0f172a; --accent: #3b82f6; --success: #22c55e; }}
                body {{ margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: radial-gradient(circle at top right, #1e293b, #0f172a); color: white; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }}
                .glass {{ background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 48px; text-align: center; max-width: 450px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); animation: fadeIn 0.8s ease-out; }}
                @keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(20px); }} to {{ opacity: 1; transform: translateY(0); }} }}
                .logo {{ font-size: 32px; font-weight: 700; letter-spacing: -1px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 12px; }}
                .logo svg {{ width: 40px; height: 40px; fill: var(--accent); }}
                .status-container {{ display: inline-flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.1); padding: 6px 16px; border-radius: 100px; color: var(--success); font-size: 14px; font-weight: 600; margin-bottom: 24px; }}
                .pulse {{ width: 8px; height: 8px; background: var(--success); border-radius: 50%; box-shadow: 0 0 0 rgba(34, 197, 94, 0.4); animation: pulse 2s infinite; }}
                @keyframes pulse {{ 0% {{ box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }} 70% {{ box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }} 100% {{ box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }} }}
                h1 {{ margin: 0; font-size: 24px; color: #f8fafc; }}
                p {{ color: #94a3b8; line-height: 1.6; margin: 16px 0 32px 0; }}
                .footer {{ margin-top: 32px; font-size: 12px; color: #475569; font-weight: 500; }}
            </style>
        </head>
        <body>
            <div class="glass">
                <div class="status-container"><div class="pulse"></div>SISTEMA OPERATIVO</div>
                <div class="logo"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>{settings.PROJECT_NAME}</div>
                <h1>Health Status v{settings.VERSION}</h1>
                <p>Todos los sistemas están respondiendo en grado Mundial dentro del entorno de {settings.ENVIRONMENT}.</p>
                <div class="footer">&copy; {time.strftime('%Y')} {settings.PROJECT_NAME}</div>
            </div>
        </body>
        </html>
        """)

    return {
        "status": "healthy",
        "version": settings.VERSION,
        "name": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }
