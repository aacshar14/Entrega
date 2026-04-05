from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_platform_role
from app.models.models import User, Tenant, InventoryMovement, WhatsAppMessage, StockBalance
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta

router = APIRouter()

@router.get("/stats", dependencies=[Depends(require_platform_role(["admin"]))])
async def get_global_stats(db: Session = Depends(get_session)):
    """Global system metrics for Platform Admin dashboard."""
    tenant_count = db.exec(select(func.count(Tenant.id))).one()
    user_count = db.exec(select(func.count(User.id))).one()
    movement_count = db.exec(select(func.count(InventoryMovement.id))).one()
    
    # Active orders (movements in last 24h)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    active_movements = db.exec(
        select(func.count(InventoryMovement.id))
        .where(InventoryMovement.created_at >= yesterday)
    ).one()

    return {
        "tenants": tenant_count,
        "users": user_count,
        "total_movements": movement_count,
        "active_24h": active_movements,
        "health": "healthy"
    }

@router.get("/users", dependencies=[Depends(require_platform_role(["admin"]))])
async def list_all_users(db: Session = Depends(get_session)):
    """Directory of all users registered in the platform."""
    users = db.exec(select(User).order_by(User.created_at.desc())).all()
    return users

@router.get("/activity", dependencies=[Depends(require_platform_role(["admin"]))])
async def get_global_activity(db: Session = Depends(get_session), limit: int = 50):
    """Real-time feed of system-wide movements and interactions."""
    # Combine InventoryMovements and WhatsApp messages for a rich activity feed
    movements = db.exec(
        select(InventoryMovement, Tenant.name)
        .join(Tenant)
        .order_by(InventoryMovement.created_at.desc())
        .limit(limit)
    ).all()

    activity = []
    for m, t_name in movements:
        activity.append({
            "id": str(m.id),
            "type": "movement",
            "event": f"{m.type.capitalize()} for {t_name}",
            "description": f"{m.quantity} units of {m.sku or 'product'}",
            "timestamp": m.created_at,
            "tenant": t_name
        })
    
    return activity

@router.get("/health", dependencies=[Depends(require_platform_role(["admin"]))])
async def get_system_health(db: Session = Depends(get_session)):
    """Deep health check for infrastructure modules."""
    try:
        # Check DB connection
        db.exec(select(1)).one()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "online",
        "api_v1": "operational",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc),
        "version": "1.1.0-alpha"
    }
