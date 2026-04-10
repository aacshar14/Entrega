from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, CustomerBalance
from uuid import UUID
from typing import List

router = APIRouter()


@router.get(
    "/",
    response_model=List[CustomerBalance],
    dependencies=[Depends(require_roles(["owner", "operator"]))],
)
async def list_balances(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
):
    """List all current customer balances (owner, operator)."""
    balances = db.exec(
        select(CustomerBalance).where(CustomerBalance.tenant_id == active_tenant_id)
    ).all()
    return balances
