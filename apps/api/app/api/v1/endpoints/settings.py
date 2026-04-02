from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User, Tenant
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional

router = APIRouter()

@router.get("/", dependencies=[Depends(require_roles(["owner"]))])
async def get_tenant_settings(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Returns the tenant's settings (owner only)."""
    tenant = db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@router.patch("/", dependencies=[Depends(require_roles(["owner"]))])
async def update_tenant_settings(
    name: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update tenant settings (owner only)."""
    tenant = db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if name is not None:
        tenant.name = name
    
    tenant.updated_at = datetime.now(timezone.utc)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant
