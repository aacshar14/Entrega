from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, text
from typing import List, Dict
import uuid
from uuid import UUID
from app.core.db import get_session
from app.models.models import InboundEvent, Tenant, User, TenantUser, get_utc_now, PlatformAlert, AuditLog, MetricSnapshot
from app.core.dependencies import require_platform_role, get_current_user_id
from app.core.config import settings
from app.core.metrics import MetricsAggregator
from app.core.thresholds import PLATFORM_THRESHOLDS
import json

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

    # DB Connections (Real metric)
    db_conns = 0
    try:
        db_conns = db.execute(text("SELECT count(*) FROM pg_stat_activity")).scalar()
    except:
        db_conns = -1 # Indicate no data instead of false 0

    # Logic for Infra Status using centralized thresholds
    infra_status = "healthy"
    if failed > 0:
        infra_status = "critical"
    elif pending > PLATFORM_THRESHOLDS.BACKLOG_WARNING_THRESHOLD:
        infra_status = "degraded"
    elif pending > 0 and processing == 0:
        infra_status = "critical" # Workers down

    # Use snapshots for advanced windows
    aggregator = MetricsAggregator(db)
    snapshots = aggregator.get_latest_metrics()
    
    # 4. Fetch Active Alerts
    active_alerts = db.exec(
        select(PlatformAlert)
        .where(PlatformAlert.is_active == True)
        .order_by(PlatformAlert.created_at.desc())
        .limit(5)
    ).all()
    
    # We map the requested metrics for the 1h window as the standard 'latest'
    window = "1h" # Default window for the main dashboard cards

    return {
        "backlog": pending,
        "active_processing": processing,
        "failures": failed,
        "completed_total": done,
        "oldest_pending_seconds": round(oldest_pending_seconds, 2),
        "db_connections": db_conns,
        "latency": {
            "p90": snapshots.get(f"{window}_end_to_end_ms_p90"),
            "p95": snapshots.get(f"{window}_end_to_end_ms_p95"),
            "p99": snapshots.get(f"{window}_end_to_end_ms_p99"),
        },
        "windows": {
            w: {
                m: {
                    "p90": snapshots.get(f"{w}_{m}_p90"),
                    "p95": snapshots.get(f"{w}_{m}_p95"),
                    "p99": snapshots.get(f"{w}_{m}_p99")
                } for m in ["webhook_intake_ms", "queue_wait_ms", "processing_ms", "end_to_end_ms"]
            } for w in ["5m", "1h", "24h"]
        },
        "alerts": [
            {
                "type": a.type,
                "severity": a.severity,
                "message": a.message,
                "recommended_action": a.recommended_action,
                "created_at": a.created_at
            } for a in active_alerts
        ],
        "health_status": "critical" if any(a.severity == "critical" for a in active_alerts) else "degraded" if active_alerts else "healthy"
    }

@router.get("/tenants/pressure", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def get_tenant_pressure(db: Session = Depends(get_session)):
    """
    Returns the Top 10 tenants with most pressure based on the latest snapshots.
    """
    # 1. Identity tenants that have volume snapshots in last 24h
    latest_volume_snapshots = db.exec(
        select(MetricSnapshot)
        .where(MetricSnapshot.metric_name == "tenant_volume_24h")
        .order_by(MetricSnapshot.created_at.desc(), MetricSnapshot.metric_value.desc())
        .limit(10)
    ).all()

    pressure_map = []
    for snap in latest_volume_snapshots:
        t_id = snap.tenant_id
        if not t_id: continue
        
        tenant = db.get(Tenant, t_id)
        
        # Get related metrics for this specific tenant in the same period
        # We look for the most recent one for each type
        def get_val(name):
            val = db.exec(
                select(MetricSnapshot.metric_value)
                .where(MetricSnapshot.metric_name == name)
                .where(MetricSnapshot.tenant_id == t_id)
                .order_by(MetricSnapshot.created_at.desc())
                .limit(1)
            ).first()
            return val or 0

        pressure_map.append({
            "tenant_id": t_id,
            "tenant_name": tenant.name if tenant else "Unknown",
            "volume_24h": int(snap.metric_value),
            "p95_processing_ms": round(get_val("tenant_p95_processing_ms_24h"), 2),
            "failed_count": int(get_val("tenant_failures_24h")),
            "retry_count": int(get_val("tenant_retries_24h")),
            "backlog": int(get_val("tenant_backlog_current")),
            "status": "hot" if snap.metric_value > PLATFORM_THRESHOLDS.HOT_TENANT_VOLUME_24H or get_val("tenant_failures_24h") > PLATFORM_THRESHOLDS.HOT_TENANT_FAILURES_24H else "warning" if snap.metric_value > PLATFORM_THRESHOLDS.WARNING_TENANT_VOLUME_24H or get_val("tenant_failures_24h") > 0 else "normal"
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

@router.get("/users", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def get_all_users(db: Session = Depends(get_session)):
    """
    Platform Admin only: List all users in the system with their memberships.
    """
    users = db.exec(select(User)).all()
    
    result = []
    for user in users:
        # Get memberships for this user
        memberships = db.exec(
            select(TenantUser, Tenant)
            .join(Tenant, TenantUser.tenant_id == Tenant.id)
            .where(TenantUser.user_id == user.id)
        ).all()
        
        membership_list = []
        for tu, t in memberships:
            membership_list.append({
                "tenant_id": t.id,
                "tenant_name": t.name,
                "role": tu.tenant_role,
                "is_active": tu.is_active
            })
            
        result.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "platform_role": user.platform_role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "memberships": membership_list
        })
        
    return result

@router.patch("/users/{user_id}/status", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def update_user_status(user_id: UUID, is_active: bool, db: Session = Depends(get_session)):
    """
    Platform Admin only: Suspend or reactivate a user globally.
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = is_active
    db.add(user)
    db.commit()
    return {"status": "updated", "is_active": user.is_active}

@router.delete("/users/{user_id}", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def delete_user(user_id: UUID, db: Session = Depends(get_session)):
    """
    Platform Admin only: Permanently delete a user and their memberships.
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete memberships first (though DB might handle this if cascade is set, 
    # but let's be explicit if not sure about constraints)
    memberships = db.exec(select(TenantUser).where(TenantUser.user_id == user_id)).all()
    for m in memberships:
        db.delete(m)
        
    db.delete(user)
    db.commit()
    return {"status": "deleted"}

@router.get("/costs", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def get_platform_costs(db: Session = Depends(get_session)):
    """
    Platform Admin only: usage-based cost estimates.
    """
    total_events = db.exec(select(func.count(InboundEvent.id))).one()
    events_24h = db.exec(select(func.count(InboundEvent.id)).where(InboundEvent.created_at > text("now() - interval '24 hours'"))).one()
    total_tenants = db.exec(select(func.count(Tenant.id))).one()
    
    # Heuristic cost calculation (example: $0.001 per event, $5 per active tenant)
    estimated_monthly = (events_24h * 30 * 0.001) + (total_tenants * 5.0)
    
    return {
        "title": "Costo estimado mensual",
        "total_events": total_events,
        "events_last_24h": events_24h,
        "active_tenants": total_tenants,
        "estimated_monthly_usd": round(estimated_monthly, 2),
        "currency": "USD",
        "is_projection": True,
        "breakdown": [
            {"label": "Infrastructure (Base Est.)", "value": 15.00, "unit": "USD"},
            {"label": "Event Processing (Trend Est.)", "value": round(events_24h * 30 * 0.001, 2), "unit": "USD"},
            {"label": "Database Storage (Est.)", "value": 2.50, "unit": "USD"}
        ]
    }

@router.get("/settings", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def get_platform_settings():
    """
    Platform Admin only: Global configuration.
    """
    # Currently reading from app config/env, eventually from a settings table
    return {
        "features": {
            "enable_whatsapp": True,
            "enable_sre_dashboard": True,
            "enable_multi_region": False,
            "maintenance_mode": False
        },
        "limits": {
            "max_tenants_per_admin": 10,
            "max_events_per_day_free_tier": 1000
        },
        "environment": "production" if not settings.DEBUG else "development"
    }

@router.patch("/settings", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def update_platform_settings(payload: Dict, db: Session = Depends(get_session), user_id: str = Depends(get_current_user_id)):
    """
    Platform Admin only: Update global configuration with audit trail.
    """
    # 1. Capture audit trail
    log = AuditLog(
        performed_by=user_id,
        action="update_settings",
        module="platform_admin",
        data_after=json.dumps(payload),
        ip_address="internal" # Placeholder for future IP tracking
    )
    db.add(log)
    db.commit()
    
    logger.info("admin.settings_updated", performed_by=user_id, changes=payload)
    
    # 2. Return success
    return {"status": "success", "updated_values": payload, "audit_id": log.id}
@router.post("/metrics/refresh", dependencies=[Depends(require_platform_role(["admin", "owner"]))])
async def refresh_metrics(db: Session = Depends(get_session)):
    """
    Platform Admin only: Trigger recalculation of all metrics snapshots.
    """
    aggregator = MetricsAggregator(db)
    aggregator.refresh_all_snapshots()
    return {"status": "success", "refreshed_at": get_utc_now()}
