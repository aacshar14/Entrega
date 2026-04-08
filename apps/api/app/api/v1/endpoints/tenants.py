from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_membership, get_active_tenant, require_roles
from app.models.models import User, Tenant, TenantUser, TenantInfo
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class TenantCreate(BaseModel):
    name: str
    slug: str

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    business_whatsapp_number: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None

@router.post("/", response_model=Tenant)
async def create_business(
    request: TenantCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Register a new business (Tenant) and assign owner role to the creator."""
    try:
        # Check if slug exists
        existing = db.exec(select(Tenant).where(Tenant.slug == request.slug)).first()
        if existing:
            raise HTTPException(status_code=400, detail="El nombre de usuario o negocio ya existe")
            
        new_tenant = Tenant(
            name=request.name.strip(),
            slug=request.slug.strip(),
            status="active"
        )
        db.add(new_tenant)
        db.flush() 
        
        # Create membership as owner
        membership = TenantUser(
            tenant_id=new_tenant.id,
            user_id=current_user.id,
            tenant_role="owner",
            is_default=True
        )
        db.add(membership)
        db.commit()
        db.refresh(new_tenant)
        return new_tenant
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Tenant creation failed for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al crear el negocio: {str(e)}"
        )

@router.get("/active", response_model=Tenant)
async def get_active_business(
    tenant: Tenant = Depends(get_active_tenant)
):
    """Get metadata for the currently active tenant."""
    return tenant

@router.patch("/active", response_model=Tenant)
async def update_active_business(
    request: TenantUpdate,
    db: Session = Depends(get_session),
    membership: TenantUser = Depends(get_active_membership)
):
    """Update metadata for the active business. Requires owner role."""
    if membership.tenant_role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can update business settings")
        
    tenant = db.get(Tenant, membership.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    if request.name is not None:
        tenant.name = request.name
        
    if request.business_whatsapp_number is not None:
        # If empty string, treat as removal (quitar)
        val = request.business_whatsapp_number.strip()
        tenant.business_whatsapp_number = val if val else None
        # Also update connected flag if removing
        if not tenant.business_whatsapp_number:
            tenant.business_whatsapp_connected = False
            
    if request.logo_url is not None:
        tenant.logo_url = request.logo_url
    if request.timezone is not None:
        tenant.timezone = request.timezone
    if request.currency is not None:
        tenant.currency = request.currency
        
    tenant.updated_at = datetime.now(timezone.utc)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant
