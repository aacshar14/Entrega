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
                logger.exception(
                    "Worker failed to process event",
                    event_id=str(event.id),
                    error=str(e),
                )
                self.qm.mark_failed(event.id, error=str(e))

        return processed

    def _process_single_event(self, event: InboundEvent):
        """
        Logic for a single event type with strict idempotency (V1.2).
        """
        from app.models.models import ProcessedMessage
        from sqlalchemy.exc import IntegrityError
        from sqlalchemy import text
        from datetime import datetime, timezone, timedelta

        # Resolve Tenant
        tenant = self.db.get(Tenant, event.tenant_id)
        if not tenant:
            raise ValueError(f"Tenant {event.tenant_id} not found for event {event.id}")

        # Bind context for logging
        structlog.contextvars.bind_contextvars(
            tenant_id=str(tenant.id), event_id=str(event.id)
        )

        if event.source == "whatsapp" and event.event_type == "message":
            msg_id = event.message_sid

            # --- 🛡️ PHASE 1: ATOMIC CLAIM (INSERT-FIRST) ---
            try:
                # 1. Attempt to claim identity
                self.db.add(
                    ProcessedMessage(
                        tenant_id=tenant.id,
                        message_id=msg_id,
                        status="processing",
                        updated_at=datetime.now(timezone.utc),
                    )
                )
                self.db.commit()
                logger.info("idempotency.identity_claimed", message_id=msg_id)
            except IntegrityError:
                # 2. Collision! Check if we can reclaim (Atomic Reclaim)
                self.db.rollback()

                # Atomic Reclaim SQL: Reclaim if FAILED or TIMED OUT (10 min)
                reclaim_sql = text("""
                    UPDATE processed_messages 
                    SET status = 'processing', updated_at = :now
                    WHERE tenant_id = :tenant_id AND message_id = :message_id
                      AND (status = 'failed' OR (status = 'processing' AND updated_at < :threshold))
                """)
                now = datetime.now(timezone.utc)
                threshold = now - timedelta(minutes=10)

                result = self.db.execute(
                    reclaim_sql,
                    {
                        "now": now,
                        "tenant_id": tenant.id,
                        "message_id": msg_id,
                        "threshold": threshold,
                    },
                )
                self.db.commit()

                if result.rowcount == 0:
                    # Message is already PROCESSED or being processed by another worker within safe window
                    logger.info("idempotency.duplicate_ignored", message_id=msg_id)
                    return

                logger.warning("idempotency.reclaimed_event", message_id=msg_id)

            # --- ⚙️ PHASE 2: BUSINESS LOGIC ---
            import json

            payload = event.payload_json
            if isinstance(payload, str):
                payload = json.loads(payload)
            sender = payload.get("from")
            body = payload.get("body")

            if not body:
                logger.warning("Empty message body, skipping parsing")
                return

            try:
                # Call Parsing Engine
                engine = ParsingEngine(self.db, tenant)
                log = engine.process_and_log(sender=sender, raw_text=body)

                # --- ✅ PHASE 3: CONDITIONAL SUCCESS ---
                success_sql = text("""
                    UPDATE processed_messages 
                    SET status = 'processed', updated_at = :now
                    WHERE tenant_id = :tenant_id AND message_id = :message_id AND status = 'processing'
                """)
                result = self.db.execute(
                    success_sql,
                    {
                        "now": datetime.now(timezone.utc),
                        "tenant_id": tenant.id,
                        "message_id": msg_id,
                    },
                )
                self.db.commit()

                if result.rowcount == 1:
                    logger.info("idempotency.success", message_id=msg_id)
                else:
                    logger.error("idempotency.success_write_lost", message_id=msg_id)

            except Exception as e:
                # --- ❌ PHASE 4: CONDITIONAL FAILURE ---
                self.db.rollback()
                logger.error(
                    "idempotency.logic_failed", message_id=msg_id, error=str(e)
                )

                fail_sql = text("""
                    UPDATE processed_messages 
                    SET status = 'failed', updated_at = :now
                    WHERE tenant_id = :tenant_id AND message_id = :message_id AND status = 'processing'
                """)
                self.db.execute(
                    fail_sql,
                    {
                        "now": datetime.now(timezone.utc),
                        "tenant_id": tenant.id,
                        "message_id": msg_id,
                    },
                )
                self.db.commit()
                raise e

        else:
            logger.warning(
                "Unsupported event type or source",
                source=event.source,
                type=event.event_type,
            )
