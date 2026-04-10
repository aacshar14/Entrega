from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from uuid import UUID
import json
from datetime import datetime, timezone

from app.core.db import get_session
from app.models.models import (
    MessageLog,
    MessageCorrection,
    CustomerAlias,
    ProductAlias,
    User,
    Tenant,
)
from app.core.dependencies import get_current_user, get_active_tenant

router = APIRouter()


@router.get("/logs", response_model=List[MessageLog])
def get_message_logs(
    session: Session = Depends(get_session),
    tenant: Tenant = Depends(get_active_tenant),
    current_user: User = Depends(get_current_user),
):
    """List message logs for the active tenant to allow review/learning."""
    statement = (
        select(MessageLog)
        .where(MessageLog.tenant_id == tenant.id)
        .order_by(MessageLog.timestamp.desc())
    )
    return session.exec(statement).all()


@router.patch("/logs/{log_id}", response_model=MessageLog)
def correct_message_log(
    log_id: UUID,
    correction: MessageCorrection,
    session: Session = Depends(get_session),
    tenant: Tenant = Depends(get_active_tenant),
    current_user: User = Depends(get_current_user),
):
    """Submit a correction for a message log (Human Review)."""
    log = session.get(MessageLog, log_id)
    if not log or log.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Log not found")

    log.corrected_intent = correction.intent
    log.corrected_entities = json.dumps(correction.entities)
    log.final_status = correction.status
    log.reviewed_at = datetime.now(timezone.utc)
    log.reviewed_by_user_id = current_user.id

    session.add(log)
    session.commit()
    session.refresh(log)
    return log


@router.post("/aliases/customer")
def add_customer_alias(
    customer_id: UUID,
    alias: str,
    session: Session = Depends(get_session),
    tenant: Tenant = Depends(get_active_tenant),
):
    """Add a common alias for a customer to help the parser."""
    new_alias = CustomerAlias(
        tenant_id=tenant.id, customer_id=customer_id, alias=alias.lower().strip()
    )
    session.add(new_alias)
    session.commit()
    return {"status": "success", "alias": alias}


@router.post("/aliases/product")
def add_product_alias(
    product_id: UUID,
    alias: str,
    session: Session = Depends(get_session),
    tenant: Tenant = Depends(get_active_tenant),
):
    """Add a common alias for a product to help the parser."""
    new_alias = ProductAlias(
        tenant_id=tenant.id, product_id=product_id, alias=alias.lower().strip()
    )
    session.add(new_alias)
    session.commit()
    return {"status": "success", "alias": alias}
