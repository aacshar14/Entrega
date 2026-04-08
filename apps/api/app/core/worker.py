import uuid
import structlog
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.queue import QueueManager
from app.core.parser import ParsingEngine
from app.models.models import InboundEvent, Tenant
from typing import Optional

logger = structlog.get_logger()

class EventWorker:
    """
    Consumes InboundEvents from the queue and dispatches them to the correct engine.
    """
    def __init__(self, db: Session):
        self.db = db
        self.qm = QueueManager(db)

    def process_pending_events(self, limit: int = 10):
        """
        Main loop for the worker to claim and process events.
        """
        worker_id = f"worker-{uuid.uuid4().hex[:8]}"
        events = self.qm.claim_events(worker_id=worker_id, limit=limit)
        
        if not events:
            return 0

        processed = 0
        for event in events:
            try:
                self._process_single_event(event)
                self.qm.mark_done(event.id)
                processed += 1
            except Exception as e:
                logger.exception("Worker failed to process event", event_id=str(event.id), error=str(e))
                self.qm.mark_failed(event.id, error=str(e))
        
        return processed

    def _process_single_event(self, event: InboundEvent):
        """
        Logic for a single event type.
        """
        # Resolve Tenant
        tenant = self.db.get(Tenant, event.tenant_id)
        if not tenant:
            raise ValueError(f"Tenant {event.tenant_id} not found for event {event.id}")

        # Bind context for logging
        structlog.contextvars.bind_contextvars(tenant_id=str(tenant.id), event_id=str(event.id))

        if event.source == "whatsapp" and event.event_type == "message":
            import json
            payload = event.payload_json
            if isinstance(payload, str):
                payload = json.loads(payload)
            sender = payload.get("from")
            body = payload.get("body")
            
            if not body:
                logger.warning("Empty message body, skipping parsing")
                return

            # Call Parsing Engine
            engine = ParsingEngine(self.db, tenant)
            log = engine.process_and_log(sender=sender, raw_text=body)
            
            logger.info("webhooks.message_parsed", 
                        intent=log.detected_intent, 
                        confidence=log.confidence,
                        needs_confirmation=log.needs_confirmation)
        else:
            logger.warning("Unsupported event type or source", source=event.source, type=event.event_type)
