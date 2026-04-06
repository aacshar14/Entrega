from datetime import datetime, timezone, timedelta
import json
import uuid
import structlog
from typing import Optional, List
from sqlmodel import Session, select, text
from app.models.models import InboundEvent, WhatsAppMessage, Tenant
from app.core.config import settings

logger = structlog.get_logger()

class QueueManager:
    def __init__(self, db: Session):
        self.db = db

    def enqueue(self, tenant_id: uuid.UUID, source: str, event_type: str, message_sid: str, payload: dict, duration_ms: Optional[float] = None) -> InboundEvent:
        """
        Push a new event into the database-backed queue.
        """
        event = InboundEvent(
            tenant_id=tenant_id,
            source=source,
            event_type=event_type,
            message_sid=message_sid,
            payload_json=json.dumps(payload),
            webhook_duration_ms=duration_ms,
            status="pending",
            available_at=datetime.now(timezone.utc)
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def claim_events(self, worker_id: str, limit: int = 10) -> List[InboundEvent]:
        """
        Atomically claim pending events for this worker using FOR UPDATE SKIP LOCKED.
        This prevents multiple workers from processing the same event.
        """
        now = datetime.now(timezone.utc)
        
        # SQL raw query for FOR UPDATE SKIP LOCKED which is much safer for concurrency in Postgres
        query = text("""
            UPDATE inbound_events
            SET 
                status = 'processing',
                locked_at = :now,
                locked_by = :worker_id,
                attempt_count = attempt_count + 1
            WHERE id IN (
                SELECT id 
                FROM inbound_events
                WHERE status IN ('pending', 'failed')
                  AND attempt_count < :max_retries
                  AND available_at <= :now
                  AND (locked_at IS NULL OR locked_at < :timeout)
                ORDER BY created_at ASC
                LIMIT :limit
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id;
        """)
        
        # Max retries and timeout for abandoned locks
        max_retries = 5
        lock_timeout = now - timedelta(minutes=5)
        
        result = self.db.execute(query, {
            "now": now,
            "worker_id": worker_id,
            "max_retries": max_retries,
            "limit": limit,
            "timeout": lock_timeout
        })
        
        # Convert result back to InboundEvent objects
        ids = [row[0] for row in result.all()]
        events = []
        for event_id in ids:
            events.append(self.db.get(InboundEvent, event_id))
            
        return events

    def mark_done(self, event_id: uuid.UUID):
        event = self.db.get(InboundEvent, event_id)
        if event:
            event.status = "done"
            event.processed_at = datetime.now(timezone.utc)
            self.db.add(event)
            self.db.commit()

    def mark_failed(self, event_id: uuid.UUID, error: str):
        event = self.db.get(InboundEvent, event_id)
        if event:
            event.status = "failed"
            event.last_error = error
            # Exponential backoff for next attempt
            delay = 2 ** event.attempt_count
            event.available_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
            self.db.add(event)
            self.db.commit()
