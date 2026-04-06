from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Dict
import uuid
from app.core.db import get_session
from app.models.models import InboundEvent, Tenant, MetricSnapshot
from app.core.dependencies import get_current_user
from app.core.config import settings

router = APIRouter()

@router.get("/queue/stats")
async def get_queue_stats(db: Session = Depends(get_session), current_user = Depends(get_current_user)):
    """
    Platform Admin only: General health of the Inbound Event Queue.
    """
    if current_user.platform_role != "admin":
        raise HTTPException(status_code=403, detail="Platform Admin access required")
    
    # Counts by status
    pending = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "pending")).one()
    processing = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "processing")).one()
    failed = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "failed")).one()
    done = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "done")).one()
    
    return {
        "backlog": pending,
        "active_processing": processing,
        "failures": failed,
        "completed_total": done,
        "health_status": "degraded" if pending > 500 or failed > 50 else "healthy"
    }

@router.get("/tenants/pressure")
async def get_tenant_pressure(db: Session = Depends(get_session), current_user = Depends(get_current_user)):
    """
    Identifies which tenants are generating the most load in the last hour.
    """
    if current_user.platform_role != "admin":
        raise HTTPException(status_code=403, detail="Platform Admin access required")

    # Simple group by and count
    statement = text("""
        SELECT tenant_id, count(*) as event_count 
        FROM inbound_events 
        WHERE created_at > now() - interval '1 hour'
        GROUP BY tenant_id 
        ORDER BY event_count DESC 
        LIMIT 10
    """)
    result = db.execute(statement).all()
    
    pressure_map = []
    for row in result:
        tenant = db.get(Tenant, row[0])
        pressure_map.append({
            "tenant_name": tenant.name if tenant else "Unknown",
            "event_count": row[1]
        })
        
    return pressure_map

@router.get("/capacity/advisor")
async def get_capacity_advisor(db: Session = Depends(get_session), current_user = Depends(get_current_user)):
    """
    Heuristic check to decide if migration to Redis/PubSub is necessary.
    """
    if current_user.platform_role != "admin":
        raise HTTPException(status_code=403, detail="Platform Admin access required")
    
    total_active = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.created_at > text("now() - interval '24 hours'"))).one()
    pending = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "pending")).one()
    
    # Simple thresholds
    if total_active < 10000 and pending < 100:
        advice = "Redis/PubSub no es necesario aún. Postgres maneja el volumen actual sin fricción."
        status = "optimal"
    elif total_active < 50000 and pending < 500:
        advice = "Conviene planificar migración. El volumen está creciendo, Postgres empezará a sentir latencia en el polling."
        status = "warning"
    else:
        advice = "Ya es necesario migrar. Recomendamos Google Cloud Tasks o Redis para desacoplar el IO de la base de datos operativa."
        status = "critical"
        
    return {
        "advice": advice,
        "status": status,
        "metrics": {
            "24h_volume": total_active,
            "current_backlog": pending
        }
    }
from fastapi import APIRouter
from sqlmodel import text
