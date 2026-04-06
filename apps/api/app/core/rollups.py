import structlog
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select, func, text
from app.core.database import engine
from app.models.models import InboundEvent, MetricSnapshot, Tenant

logger = structlog.get_logger()

def perform_rollups():
    """
    EntréGA Capacity Engineering:
    Aggregates raw event data into MetricSnapshots to power the Platform Admin Dashboard.
    Runs every 15 minutes (conceptually).
    """
    now = datetime.now(timezone.utc)
    fifteen_mins_ago = now - timedelta(minutes=15)
    
    with Session(engine) as db:
        # 1. Global Latency Snapshot (p95)
        # We calculate the difference between created_at and processed_at for 'done' events
        latency_stmt = text("""
            SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000))
            FROM inbound_events
            WHERE status = 'done' AND processed_at > :since
        """)
        p95_latency = db.execute(latency_stmt, {"since": fifteen_mins_ago}).scalar()
        
        if p95_latency:
            snapshot = MetricSnapshot(
                metric_name="latency_p95_ms",
                metric_value=float(p95_latency),
                period_start=fifteen_mins_ago,
                period_end=now
            )
            db.add(snapshot)
            logger.info("rollup.latency_created", ms=p95_latency)

        # 2. Backlog Pressure per Tenant
        tenants = db.exec(select(Tenant)).all()
        for tenant in tenants:
            backlog_count = db.exec(
                select(func.count(InboundEvent.id))
                .where(InboundEvent.tenant_id == tenant.id)
                .where(InboundEvent.status == "pending")
            ).one()
            
            if backlog_count > 0:
                db.add(MetricSnapshot(
                    tenant_id=tenant.id,
                    metric_name="backlog_size",
                    metric_value=float(backlog_count),
                    period_start=fifteen_mins_ago,
                    period_end=now
                ))
        
        db.commit()
        logger.info("rollup.completed")

if __name__ == "__main__":
    perform_rollups()
