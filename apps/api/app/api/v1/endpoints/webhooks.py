import json
from fastapi import APIRouter, Request, Query, HTTPException, Depends
from sqlmodel import Session
from app.core.config import settings
from app.core.db import get_session
from app.core.logging import logger
from app.models.models import WhatsAppMessage
from app.services.parser_service import ParserService

router = APIRouter()

@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """WhatsApp webhook verification for Meta Cloud API integration."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("Webhook verified successfully", challenge=hub_challenge)
        return int(hub_challenge)
    
    logger.warning("Webhook verification failed", mode=hub_mode, token=hub_verify_token)
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/whatsapp")
async def receive_whatsapp_event(
    request: Request,
    db: Session = Depends(get_session)
):
    """Handles incoming WhatsApp events (messages, status updates, etc)."""
    payload = await request.json()
    logger.info("WhatsApp event received", payload=payload)

    # Initial structure parsing for Meta's complex payload
    try:
        entry = payload.get('entry', [])[0]
        changes = entry.get('changes', [])[0]
        value = changes.get('value', {})
        messages = value.get('messages', [])
        
        if messages:
            msg = messages[0]
            from_number = msg.get('from')
            msg_id = msg.get('id')
            body = msg.get('text', {}).get('body')
            msg_type = msg.get('type', 'text')
            
            # Persist raw message before processing
            new_msg = WhatsAppMessage(
                from_number=from_number,
                message_sid=msg_id,
                body=body,
                message_type=msg_type,
                raw_payload=json.dumps(payload),
                processed=False
            )
            
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)
            
            # Process intent and update domain logic
            # In V1.1 this runs synchronously for simplicity/pilot
            await ParserService.process_message(db, new_msg)
            
            logger.info("Message processed and saved", message_id=msg_id, intent=new_msg.intent)
            
        return {"status": "accepted"}
        
    except (IndexError, KeyError, Exception) as e:
        logger.error("Error parsing WhatsApp webhook payload", error=str(e))
        # Meta expects 200 even for parsing errors to prevent retries
        return {"status": "error", "message": str(e)}
