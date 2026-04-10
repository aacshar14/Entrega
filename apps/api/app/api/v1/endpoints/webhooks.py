import json
import hmac
import hashlib
import structlog
from fastapi import APIRouter, Request, Query, HTTPException, Depends, BackgroundTasks
from fastapi.responses import PlainTextResponse
from sqlmodel import Session, select, text
from app.core.config import settings
from app.core.db import get_session
from app.core.logging import logger
from app.models.models import WhatsAppMessage, Tenant, MessageLog, InboundEvent
from app.core.parser import ParsingEngine
from app.core.limiter import limiter
from app.core.queue import QueueManager
from app.core.worker import EventWorker

router = APIRouter()


@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    db: Session = Depends(get_session),
):
    """WhatsApp webhook verification for Meta Cloud API integration."""
    # 🔍 Dynamic Verification Policy
    verify_token = settings.WHATSAPP_VERIFY_TOKEN
    try:
        # Check if we have a dynamic token in system_settings
        result = db.execute(
            text(
                "SELECT value FROM system_settings WHERE key = 'whatsapp_verify_token'"
            )
        ).first()
        if result and result[0]:
            verify_token = str(result[0]).strip()
    except Exception:
        pass  # Fallback to settings if table doesn't exist

    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        # 🛡️ Meta requires the challenge to be returned as plain text
        return PlainTextResponse(content=hub_challenge)

    raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/whatsapp")
@limiter.limit("20/minute")
async def receive_whatsapp_event(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
):
    """
    Handles incoming WhatsApp events.
    1. Validates X-Hub-Signature-256 signature from Meta.
    2. Implements 'Learning Mode' strategy by logging every message.
    """
    # --- 1. SIGNATURE VALIDATION (Security P0 / Stabilization V1.2) ---
    if settings.ALLOW_INSECURE_WEBHOOKS:
        if settings.ENVIRONMENT == "production":
            logger.critical("PRODUCTION SECURITY BREACH")
        else:
            logger.warning("INSECURE MODE")
        body_bytes = await request.body()
    else:
        signature = request.headers.get("X-Hub-Signature-256")

        if not signature:
            raise HTTPException(status_code=401, detail="Signature missing")

        if not signature.startswith("sha256="):
            raise HTTPException(status_code=401, detail="Invalid signature format")

        secret = settings.WHATSAPP_APP_SECRET
        if not secret:
            raise HTTPException(
                status_code=500, detail="Webhook security not configured"
            )

        body_bytes = await request.body()

        try:
            expected_sig = signature[len("sha256=") :].strip()
            h = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256)

            if not hmac.compare_digest(h.hexdigest(), expected_sig):
                raise HTTPException(status_code=401, detail="Invalid signature")

        except Exception:
            raise HTTPException(status_code=401, detail="Invalid signature format")

    import time

    start_time = time.perf_counter()

    # Use the local body_bytes to avoid re-reading the consumed stream
    payload = json.loads(body_bytes)

    # --- 2. EXTRACTION & IDEMPOTENCY PRE-CHECK (P0 - V1.2) ---
    try:
        entry = payload.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        metadata = value.get("metadata", {})
        business_number_id = metadata.get("phone_number_id")
        messages = value.get("messages", [])

        if not messages:
            return {"status": "accepted"}

        msg = messages[0]
        msg_id = msg.get("id")
        from_number = msg.get("from")
        body = msg.get("text", {}).get("body")

        if not body or not msg_id:
            return {"status": "ignored_non_compliant"}

    except (IndexError, KeyError, TypeError, AttributeError) as e:
        logger.error("webhooks.payload_parsing_failed", error=str(e))
        return {"status": "error", "message": "Malformed Meta payload"}

    # Optimization: Early skip if already known (Non-atomic pre-check)
    from app.models.models import ProcessedMessage

    existing = db.exec(
        select(ProcessedMessage).where(ProcessedMessage.message_id == msg_id)
    ).first()
    if existing and existing.status == "processed":
        logger.info("webhooks.duplicate_detected_precheck", message_id=msg_id)
        return {"status": "accepted_duplicate"}

    # 2. 🏛️ Resolve Tenant based on meta phone_number_id (Unified V1.4)
    try:
        from app.models.models import TenantWhatsAppIntegration

        # Single Source of Truth: Integration table
        integration = db.exec(
            select(TenantWhatsAppIntegration).where(
                TenantWhatsAppIntegration.phone_number_id == str(business_number_id)
            )
        ).first()

        if not integration:
            logger.warning("webhooks.tenant_not_found", phone_number_id=business_number_id)
            return {"status": "error", "message": "Tenant not integrated"}

        target_tenant_id = integration.tenant_id

        if not target_tenant_id:
            logger.warning(
                "No tenant mapping found for meta phone number id",
                phone_number_id=business_number_id,
            )
            return {"status": "error", "detail": "Tenant not recognized"}

        # Bind tenant context for ALL subsequent logs in this request
        structlog.contextvars.bind_contextvars(tenant_id=str(target_tenant_id))

        tenant = db.exec(select(Tenant).where(Tenant.id == target_tenant_id)).first()
        if not tenant:
            return {"status": "error", "detail": "Tenant not found"}

        # 3. 🗄️ Persist raw WhatsAppMessage model for history
        new_msg = WhatsAppMessage(
            tenant_id=tenant.id,
            from_number=from_number,
            message_sid=msg_id,
            body=body,
            raw_payload=json.dumps(payload),
        )
        db.add(new_msg)

        # 4. 📭 Enqueue Event for Async Processing
        qm = QueueManager(db)

        # Calculate intake duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        qm.enqueue(
            tenant_id=tenant.id,
            source="whatsapp",
            event_type="message",
            message_sid=msg_id,
            payload={"from": from_number, "body": body},
            duration_ms=duration_ms,
        )

        db.commit()

        # 🚀 Immediate Background Dispatcher
        worker = EventWorker(db)
        background_tasks.add_task(worker.process_pending_events, limit=5)

        logger.info(
            "webhooks.whatsapp_enqueued", message_id=msg_id, intake_ms=duration_ms
        )
        return {"status": "accepted"}

    except Exception as e:
        logger.error(f"Webhook Error: {str(e)}")
        return {"status": "error", "message": str(e)}
