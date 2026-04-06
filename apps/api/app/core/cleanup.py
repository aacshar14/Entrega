import structlog
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select, text
from app.core.database import engine
from app.models.models import InboundEvent

logger = structlog.get_logger()

def cleanup_done_events(days: int = 30):
    """
    EntréGA Maintenance:
    Prunes finished events from the queue to prevent unbounded table growth.
    """
    threshold = datetime.now(timezone.utc) - timedelta(days=days)
    
    with Session(engine) as db:
        # Direct SQL delete for efficiency
        stmt = text("""
            DELETE FROM inbound_events 
            WHERE status = 'done' 
              AND processed_at < :threshold
        """)
        result = db.execute(stmt, {"threshold": threshold})
        db.commit()
        
        deleted_count = result.rowcount
        logger.info("cleanup.completed", deleted_count=deleted_count, threshold=threshold.isoformat())

if __name__ == "__main__":
    import sys
    days_to_keep = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    cleanup_done_events(days_to_keep)
