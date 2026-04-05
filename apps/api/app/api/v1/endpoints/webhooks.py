import json
from fastapi import APIRouter, Request, Query, HTTPException, Depends
from sqlmodel import Session
from app.core.config import settings
from app.core.db import get_session
from app.core.logging import logger
from app.models.models import WhatsAppMessage, Tenant, MessageLog
from app.core.parser import ParsingEngine
from sqlmodel import select

router = APIRouter()

@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """WhatsApp webhook verification for Meta Cloud API integration."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(hub_challenge)
    
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/whatsapp")
async def receive_whatsapp_event(
    request: Request,
    db: Session = Depends(get_session)
):
    """
    Handles incoming WhatsApp events. 
    Implements 'Learning Mode' strategy by logging every message.
    """
    payload = await request.json()
    
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

        tenant = db.exec(select(Tenant).where(Tenant.id == config.tenant_id)).first()
        if not tenant:
            return {"status": "error", "detail": "Tenant not found"}

        # 3. 🧠 Parsing Engine v1 (Learning First)
        engine = ParsingEngine(db, tenant)
        log = engine.parse_message(sender=from_number, raw_text=body)
        db.add(log)
        
        # 4. 🗄️ Persist raw WhatsAppMessage model for history & idempotency
        new_msg = WhatsAppMessage(
            tenant_id=tenant.id,
            from_number=from_number,
            message_sid=msg_id,
            body=body,
            raw_payload=json.dumps(payload)
        )
        db.add(new_msg)
        db.commit()

        return {"status": "accepted"}
        
    except Exception as e:
        logger.error(f"Webhook Error: {str(e)}")
        return {"status": "error", "message": str(e)}
