import time
import json
import structlog
import socket
from typing import NoReturn
from sqlmodel import Session, select
from app.core.db import engine
from app.core.queue import QueueManager
from app.core.parser import ParsingEngine
from app.models.models import Tenant, InboundEvent

logger = structlog.get_logger()

def process_event(db: Session, event: InboundEvent):
    """
    Business logic transition: Unpacks event and runs ParsingEngine.
    """
    tenant = db.get(Tenant, event.tenant_id)
    if not tenant:
        raise ValueError(f"Tenant {event.tenant_id} not found")

    payload = json.loads(event.payload_json)
    
    # We reconstruct the context that was originally in the webhook
    # This is where 'ParsingEngine' (the heavy lifter) now lives.
    parser = ParsingEngine(db, tenant)
    
    # Extract data from payload (assuming WhatsApp source)
    from_number = payload.get("from")
    body = payload.get("body")
    
    if not from_number or not body:
         logger.warning("worker.invalid_payload", event_id=str(event.id))
         return

    # Process!
    parser.parse_message(sender=from_number, raw_text=body)
    logger.info("worker.event_processed", event_id=str(event.id), tenant_id=str(tenant.id))

def run_worker() -> NoReturn:
    """
    Main loop for the EntréGA Background Worker.
    """
    worker_id = f"worker-{socket.gethostname()}-{time.time()}"
    logger.info("worker.started", worker_id=worker_id)
    
    while True:
        try:
            with Session(engine) as db:
                qm = QueueManager(db)
                events = qm.claim_events(worker_id=worker_id, limit=5)
                
                if not events:
                    # No work? Sleep a bit.
                    time.sleep(2)
                    continue
                
                for event in events:
                    try:
                        logger.info("worker.processing_event", event_id=str(event.id))
                        process_event(db, event)
                        qm.mark_done(event.id)
                    except Exception as e:
                        logger.error("worker.event_failed", event_id=str(event.id), error=str(e))
                        qm.mark_failed(event.id, error=str(e))
                        
        except Exception as e:
            logger.error("worker.loop_error", error=str(e))
            time.sleep(5)

if __name__ == "__main__":
    run_worker()
