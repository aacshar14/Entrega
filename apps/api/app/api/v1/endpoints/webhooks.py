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

        # 1. Resolve Tenant based on business_number_id or metadata
        # For now, we assume the system knows which business number corresponds to which tenant
        # In production, we'd have a mapping table or look up business_whatsapp_number
        tenant = db.exec(select(Tenant).where(Tenant.business_whatsapp_number == business_number_id)).first()
        if not tenant:
            # Fallback for pilot: look for first tenant if only one exists, or log as unknown
            tenant = db.exec(select(Tenant)).first() 

        # 2. Parsing Engine v1 (Learning First)
        if tenant:
            engine = ParsingEngine(db, tenant)
            log = engine.parse_message(sender=from_number, raw_text=body)
            # log.external_id = msg_id # Optional link
            db.add(log)
            db.commit()

            # 3. Persist raw WhatsAppMessage model for history
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
