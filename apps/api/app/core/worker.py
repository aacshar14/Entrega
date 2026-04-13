import uuid
import structlog
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.queue import QueueManager
from app.core.parser import ParsingEngine
from typing import Optional
from app.models.models import InboundEvent, Tenant, BusinessMetricEvent

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

                # --- 📊 Emit Business Event: Processing Failed ---
                try:
                    self.db.add(
                        BusinessMetricEvent(
                            tenant_id=event.tenant_id,
                            event_type="processing_failed",
                            metadata_json=str(e)[:500],
                        )
                    )
                    self.db.commit()
                except Exception:
                    self.db.rollback()

        return processed

    def _process_single_event(self, event: InboundEvent):
        """
        Logic for a single event type with strict idempotency and retry logic (V1.2).
        """
        from sqlalchemy.exc import OperationalError
        import time

        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            try:
                self._execute_single_event_transactional(event)
                return  # Success
            except OperationalError as e:
                # ️⚠️ LOCK CONTENTION (Audit Log)
                logger.warning(
                    "worker.db_lock_contention",
                    attempt=attempt + 1,
                    event_id=str(event.id),
                    wait_time=0.1 * (attempt + 1),
                )
                self.db.rollback()
                time.sleep(0.1 * (attempt + 1))  # Calibrated progressive backoff
                last_error = e
            except Exception as e:
                # Non-recoverable logic error
                self.db.rollback()
                raise e

        if last_error:
            logger.error(
                "worker.max_retries_exhausted",
                event_id=str(event.id),
                error=str(last_error),
            )
            raise last_error

    def _execute_single_event_transactional(self, event: InboundEvent):
        """
        Inner transactional logic for event processing.
        """
        from app.models.models import ProcessedMessage
        from sqlalchemy.exc import IntegrityError
        from sqlalchemy import text
        from datetime import datetime, timezone, timedelta
        import json

        # Resolve Tenant
        tenant = self.db.get(Tenant, event.tenant_id)
        if not tenant:
            raise ValueError(f"Tenant {event.tenant_id} not found for event {event.id}")

        # Bind context for logging
        structlog.contextvars.bind_contextvars(
            tenant_id=str(tenant.id), event_id=str(event.id)
        )

        # --- BILLING ENFORCEMENT (V2.5.0 Async / V2.8.0 Hardened) ---
        from app.core.billing import BillingResolver
        billing = BillingResolver.resolve_billing(tenant)
        
        if not billing.entitlements.can_process_whatsapp:
            logger.warning(
                "worker.billing_block_active", 
                status=billing.effective_status,
                event_type=event.event_type,
                tenant_id=str(tenant.id)
            )
            # HARDENING: Do not mark as DONE if billing is the blocker.
            # Raise an exception so it goes to the mark_failed flow with context.
            raise ValueError(f"BILLING_BLOCKED: {billing.effective_status}")

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
                    logger.info("idempotency.duplicate_ignored", message_id=msg_id)
                    return

                logger.warning("idempotency.reclaimed_event", message_id=msg_id)

            # --- ⚙️ PHASE 2: BUSINESS LOGIC ---
            from app.models.models import WhatsAppMessage

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
            receipt_data = None
            error_msg = None
            error_code = None

            try:
                log, receipt_data = engine.process_and_log(sender=sender, raw_text=body)
                msg_status = (
                    "processed" if log.final_status == "processed" else "failed"
                )
                if msg_status == "failed":
                    error_code = "UNKNOWN_INTENT"
            except Exception as e:
                error_msg = str(e)
                msg_status = "failed"
                # Determine normalized error code
                if "Stock insuficiente" in error_msg:
                    error_code = "STOCK_INSUFFICIENT"
                elif "Customer not found" in error_msg:
                    error_code = "CUSTOMER_NOT_FOUND"
                else:
                    error_code = "RUNTIME_ERROR"
                logger.error(
                    "worker.business_logic_failed", error=error_msg, code=error_code
                )

            # 🗄️ Update Audit Model (WhatsAppMessage)
            inbound_msg = self.db.exec(
                select(WhatsAppMessage).where(WhatsAppMessage.message_sid == msg_id)
            ).first()
            if inbound_msg:
                inbound_msg.processing_status = msg_status
                inbound_msg.processed_at = datetime.now(timezone.utc)
                inbound_msg.last_error = error_msg
                inbound_msg.last_error_code = error_code
                self.db.add(inbound_msg)
                self.db.commit()

            # 📩 Dispatch Adaptive Receipt (Delivery or Payment)
            if receipt_data:
                try:
                    from app.services.whatsapp_service import WhatsAppService

                    ws = WhatsAppService(self.db)

                    if receipt_data.get("type") == "payment":
                        ws.send_payment_receipt(tenant, receipt_data)
                    else:
                        ws.send_order_receipt(tenant, receipt_data)
                except Exception as e:
                    logger.error("worker.receipt_dispatch_failed", error=str(e))

            # 🚀 Immediate Dashboard Refresh (Phase 5: Resilient Dispatch)
            try:
                from app.services.dashboard_service import DashboardService

                ds = DashboardService(self.db)
                # We specifically refresh today's window with the new counter-incrementing upsert
                ds.refresh_daily_kpis(tenant.id, date=datetime.now(timezone.utc))
                logger.info("worker.dashboard_refreshed", tenant_id=str(tenant.id))
            except Exception as e:
                # Log but do not fail the event processing if metrics refresh fails
                logger.error(
                    "worker.dashboard_refresh_failed",
                    error=str(e),
                    tenant_id=str(tenant.id),
                )

            # --- ✅ PHASE 3: IDEMPOTENCY FINALIZE ---
            success_sql = text("""
                UPDATE processed_messages 
                SET status = :status, updated_at = :now
                WHERE tenant_id = :tenant_id AND message_id = :message_id AND status = 'processing'
            """)
            result = self.db.execute(
                success_sql,
                {
                    "status": "processed" if msg_status == "processed" else "failed",
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

        else:
            logger.warning(
                "Unsupported event type or source",
                source=event.source,
                type=event.event_type,
            )
