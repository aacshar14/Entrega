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
    db: Session = Depends(get_session)
):
    """WhatsApp webhook verification for Meta Cloud API integration."""
    # 🔍 Dynamic Verification Policy
    verify_token = settings.WHATSAPP_VERIFY_TOKEN
    try:
        # Check if we have a dynamic token in system_settings
        result = db.execute(text("SELECT value FROM system_settings WHERE key = 'whatsapp_verify_token'")).first()
        if result and result[0]:
            verify_token = str(result[0]).strip()
    except Exception:
        pass # Fallback to settings if table doesn't exist

    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        # 🛡️ Meta requires the challenge to be returned as plain text
        return PlainTextResponse(content=hub_challenge)
    
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/whatsapp")
@limiter.limit("20/minute")
async def receive_whatsapp_event(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session)
):
    """
    Handles incoming WhatsApp events. 
    1. Validates X-Hub-Signature-256 signature from Meta.
    2. Implements 'Learning Mode' strategy by logging every message.
    """
    # --- 1. SIGNATURE VALIDATION ---
    signature = request.headers.get("X-Hub-Signature-256")
    if not signature:
        logger.error("MISSING SIGNATURE: Webhook request rejected.")
        raise HTTPException(status_code=401, detail="Signature missing")

    body_bytes = await request.body()
    try:
        # Extract sha256={hash}
        expected_sig = signature.split("=")[1]
        secret = settings.WHATSAPP_APP_SECRET or ""
        h = hmac.new(secret.encode(), body_bytes, hashlib.sha256)
        if not hmac.compare_digest(h.hexdigest(), expected_sig):
             logger.error("INVALID SIGNATURE: Payload verification failed.")
             raise HTTPException(status_code=401, detail="Invalid signature")
    except Exception as e:
        logger.error("SECURITY ERROR: Signature processing failed.", error=str(e))
        raise HTTPException(status_code=401, detail="Could not verify signature")

    import time
    start_time = time.perf_counter()
    
    payload = json.loads(body_bytes)
    
    try:
        # Extract basic info
        entry = payload.get('entry', [])[0]
        changes = entry.get('changes', [])[0]
        value = changes.get('value', {})
        metadata = value.get('metadata', {})
        business_number_id = metadata.get('phone_number_id') # Who was the message sent TO
        messages = value.get('messages', [])
        
        if not messages:
            return {"status": "accepted"}

        msg = messages[0]
        from_number = msg.get('from') # Sender (repartidor/client)
        msg_id = msg.get('id')
        body = msg.get('text', {}).get('body')
        
        if not body:
            return {"status": "ignored_non_text"}

        # 1. 🛡️ Idempotency Check: Avoid reprocessing the same message
        existing_msg = db.exec(select(WhatsAppMessage).where(WhatsAppMessage.message_sid == msg_id)).first()
        if existing_msg:
            logger.info("Message already processed, skipping duplicate", message_id=msg_id)
            return {"status": "accepted_duplicate"}

        # 2. 🏛️ Resolve Tenant based on meta phone_number_id
        from app.models.models import WhatsAppConfig
        config = db.exec(select(WhatsAppConfig).where(WhatsAppConfig.meta_phone_number_id == str(business_number_id))).first()
        
        if not config:
            logger.warning("No configuration found for meta phone number id", phone_number_id=business_number_id)
            return {"status": "error", "detail": "Tenant not recognized"}

        # Bind tenant context for ALL subsequent logs in this request
        structlog.contextvars.bind_contextvars(tenant_id=str(config.tenant_id))

        tenant = db.exec(select(Tenant).where(Tenant.id == config.tenant_id)).first()
        if not tenant:
            return {"status": "error", "detail": "Tenant not found"}

        # 3. 🗄️ Persist raw WhatsAppMessage model for history
        new_msg = WhatsAppMessage(
            tenant_id=tenant.id,
            from_number=from_number,
            message_sid=msg_id,
            body=body,
            raw_payload=json.dumps(payload)
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
            duration_ms=duration_ms
        )
        
        db.commit()

        # 🚀 Immediate Background Dispatcher
        worker = EventWorker(db)
        background_tasks.add_task(worker.process_pending_events, limit=5)

        logger.info("webhooks.whatsapp_enqueued", message_id=msg_id, intake_ms=duration_ms)
        return {"status": "accepted"}
        
    except Exception as e:
        logger.error(f"Webhook Error: {str(e)}")
        return {"status": "error", "message": str(e)}
