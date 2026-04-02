from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, Tenant
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional

router = APIRouter()

@router.get("/", dependencies=[Depends(require_roles(["owner"]))])
async def get_tenant_settings(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Returns the tenant's settings (owner only)."""
    tenant = db.get(Tenant, active_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@router.patch("/", dependencies=[Depends(require_roles(["owner"]))])
async def update_tenant_settings(
    name: Optional[str] = None,
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Update tenant settings (owner only)."""
    tenant = db.get(Tenant, active_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if name is not None:
        tenant.name = name
    
    tenant.updated_at = datetime.now(timezone.utc)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant
