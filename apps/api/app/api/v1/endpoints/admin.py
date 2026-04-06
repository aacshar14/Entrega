from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, text
from typing import List, Dict
import uuid
from app.core.db import get_session
from app.models.models import InboundEvent, Tenant, get_utc_now
from app.core.dependencies import require_platform_role
from app.core.config import settings

router = APIRouter()

@router.get("/queue/stats", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def get_queue_stats(db: Session = Depends(get_session)):
    """
    Platform Admin only: General health of the Inbound Event Queue.
    """
    pending = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "pending")).one()
    processing = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "processing")).one()
    failed = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "failed")).one()
    done = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "done")).one()
    
    # Oldest pending age
    oldest_pending = db.exec(
        select(InboundEvent.available_at)
        .where(InboundEvent.status == "pending")
        .order_by(InboundEvent.available_at)
        .limit(1)
    ).first()
    
    oldest_pending_seconds = 0
    if oldest_pending:
        oldest_pending_seconds = (get_utc_now() - oldest_pending).total_seconds()

    # Latency p90, p95, p99 (last 24h)
    latency_stats = db.execute(text("""
        SELECT 
            PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p90,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p95,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p99
        FROM inbound_event
        WHERE status = 'done' 
          AND processed_at > now() - interval '24 hours'
          AND processed_at >= created_at
    """)).first()

    # DB Connections (Real metric)
    db_conns = 0
    try:
        db_conns = db.execute(text("SELECT count(*) FROM pg_stat_activity")).scalar()
    except:
        db_conns = -1 # Indicate no data instead of false 0

    # Logic for Infra Status
    # backlog > 500 -> warning
    # failed jobs > 0 -> critical
    # (workers down is proxied by active_processing == 0 when backlog > 0)
    infra_status = "healthy"
    if failed > 0:
        infra_status = "critical"
    elif pending > 500:
        infra_status = "degraded"
    elif pending > 0 and processing == 0:
        infra_status = "critical" # Workers down

    return {
        "backlog": pending,
        "active_processing": processing,
        "failures": failed,
        "completed_total": done,
        "oldest_pending_seconds": round(oldest_pending_seconds, 2),
        "db_connections": db_conns,
        "latency": {
            "p90": round(latency_stats[0], 2) if latency_stats and latency_stats[0] is not None else None,
            "p95": round(latency_stats[1], 2) if latency_stats and latency_stats[1] is not None else None,
            "p99": round(latency_stats[2], 2) if latency_stats and latency_stats[2] is not None else None,
        },
        "health_status": infra_status
    }

@router.get("/tenants/pressure", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def get_tenant_pressure(db: Session = Depends(get_session)):
    """
    Identifies which tenants are generating the most load in the last hour.
    """
    statement = text("""
        SELECT tenant_id, count(*) as event_count 
        FROM inbound_event 
        WHERE created_at > now() - interval '1 hour'
        GROUP BY tenant_id 
        ORDER BY event_count DESC 
        LIMIT 10
    """)
    result = db.execute(statement).all()
    
    if not result:
        return []
        
    pressure_map = []
    for row in result:
        tenant = db.get(Tenant, row[0])
        pressure_map.append({
            "tenant_name": tenant.name if tenant else "Unknown",
            "event_count": row[1]
        })
        
    return pressure_map

@router.post("/queue/requeue-failed", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def requeue_failed(db: Session = Depends(get_session)):
    """
    DLQ Re-enqueue:
    Resets all 'failed' events back to 'pending' to allow workers to retry them.
    """
    stmt = text("""
        UPDATE inbound_event 
        SET status = 'pending', attempt_count = 0, last_error = 'Manual requeue by admin'
        WHERE status = 'failed'
    """)
    result = db.execute(stmt)
    db.commit()
    
    return {"requeued_count": result.rowcount}

@router.get("/capacity/advisor", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def get_capacity_advisor(db: Session = Depends(get_session)):
    """
    Heuristic check to decide if migration to Redis/PubSub is necessary.
    """
    total_active = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.created_at > text("now() - interval '24 hours'"))).one()
    pending = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.status == "pending")).one()
    
    # Updated labels per requirements
    if total_active < 10000 and pending < 100:
        advice = "Operando normal"
        status = "healthy"
    elif total_active < 50000 and pending < 500:
        advice = "Monitorear crecimiento"
        status = "degraded"
    else:
        advice = "Escalar recomendado"
        status = "critical"
        
    return {
        "advice": advice,
        "status": status,
        "metrics": {
            "24h_volume": total_active if total_active > 0 else None,
            "current_backlog": pending
        }
    }
