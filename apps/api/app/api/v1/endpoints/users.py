from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_membership, require_roles, get_active_tenant_id
from app.models.models import User, Tenant, TenantUser, Customer, Product, MeResponse, MembershipInfo, TenantInfo
from typing import List, Optional
from uuid import UUID

router = APIRouter()

def get_tenant_info(db: Session, tenant: Tenant) -> TenantInfo:
    """Helper to calculate onboarding progress for a tenant."""
    # Check if has customers
    has_customers = db.exec(
        select(func.count(Customer.id)).where(Customer.tenant_id == tenant.id)
    ).one() > 0
    
    # Check if has products
    has_products = db.exec(
        select(func.count(Product.id)).where(Product.tenant_id == tenant.id)
    ).one() > 0
    
    # Check WhatsApp
    from app.models.models import WhatsAppConfig
    wa_config = db.exec(
        select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == tenant.id)
    ).first()
    
    has_wa = wa_config is not None and wa_config.meta_onboarding_status == "verified"

    return TenantInfo(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        logo_url=tenant.logo_url,
        status=tenant.status,
        onboarding_step=1 if not has_customers else (2 if not has_products else (3 if not has_wa else 4)),
        business_whatsapp_number=tenant.business_whatsapp_number,
        clients_imported=has_customers,
        stock_imported=has_products,
        business_whatsapp_connected=has_wa,
        whatsapp_status=wa_config.meta_onboarding_status if wa_config else "disconnected",
        whatsapp_display_number=wa_config.display_phone_number if wa_config else None,
        whatsapp_account_name=wa_config.whatsapp_business_account_name if wa_config else None,
        timezone=tenant.timezone,
        currency=tenant.currency,
        ready=has_customers and has_products # Business rule: customers + stock = ready
    )

@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    active_membership: Optional[TenantUser] = Depends(get_active_membership),
    db: Session = Depends(get_session)
):
    """
    Returns current user profile, active tenant context, and all memberships.
    Calculates real-time onboarding progress for the pilot activation flow.
    """
    # 1. Resolve memberships based on platform role
    if current_user.platform_role == "admin":
        # Platform Admins see ALL tenants
        tenants_db = db.exec(select(Tenant)).all()
        membership_infos = []
        active_tenant_info = None
        
        for t in tenants_db:
            t_info = get_tenant_info(db, t)
            m_info = MembershipInfo(
                tenant=t_info,
                role="owner", # Admin is effectively owner of all
                is_default=t.slug == "entrega"
            )
            membership_infos.append(m_info)
            
            # If the admin has selected a tenant via X-Tenant-Id, use it as active
            if active_membership and t.id == active_membership.tenant_id:
                active_tenant_info = t_info
        
        # fallback: if no active tenant, but we have memberships, pick default or first
        if not active_tenant_info and membership_infos:
            default_m = next((m for m in membership_infos if m.is_default), membership_infos[0])
            active_tenant_info = default_m.tenant
                
        return MeResponse(
            user=current_user,
            active_tenant=active_tenant_info,
            memberships=membership_infos
        )

    # 2. Standard User Resolution
    memberships_db = db.exec(
        select(TenantUser, Tenant)
        .join(Tenant)
        .where(TenantUser.user_id == current_user.id)
    ).all()
    
    membership_infos = []
    active_tenant_info = None
    
    for tu, t in memberships_db:
        t_info = get_tenant_info(db, t)
        m_info = MembershipInfo(
            tenant=t_info,
            role=tu.tenant_role,
            is_default=tu.is_default
        )
        membership_infos.append(m_info)
        
        if active_membership and tu.tenant_id == active_membership.tenant_id:
            active_tenant_info = t_info

    return MeResponse(
        user=current_user,
        active_tenant=active_tenant_info,
        memberships=membership_infos
    )

@router.get("", response_model=List[dict], dependencies=[Depends(require_roles(["owner"]))])
async def list_users(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """List all users for the tenant with their roles (owner only)."""
    users_db = db.exec(
        select(User, TenantUser.tenant_role, TenantUser.is_active)
        .join(TenantUser)
        .where(TenantUser.tenant_id == active_tenant_id)
    ).all()
    
    # Return mapping
    response = []
    for u, role, active in users_db:
        # Extend the user object for the response
        u_dict = u.model_dump()
        u_dict["role"] = role
        u_dict["is_active"] = active
        response.append(u_dict)
    return response

@router.patch("/me", response_model=User)
async def update_me(
    full_name: str,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Allows any authenticated user to update their own full name."""
    current_user.full_name = full_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

class UserCreate(BaseModel):
    email: str
    full_name: str
    role: str = "operator"

@router.post("", response_model=User, dependencies=[Depends(require_roles(["owner"]))])
async def create_user(
    request: UserCreate,
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """
    Invite/Create a new user for the tenant.
    In the pilot, we create a local user and a membership.
    """
    # Check if user already exists globally
    user = db.exec(select(User).where(User.email == request.email)).first()
    
    if not user:
        user = User(
            email=request.email,
            full_name=request.full_name,
            platform_role="user"
        )
        db.add(user)
        db.flush()
    
    # Check if already a member
    membership = db.exec(
        select(TenantUser).where(
            TenantUser.user_id == user.id,
            TenantUser.tenant_id == active_tenant_id
        )
    ).first()
    
    if not membership:
        membership = TenantUser(
            tenant_id=active_tenant_id,
            user_id=user.id,
            tenant_role=request.role
        )
        db.add(membership)
    
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{id}", response_model=User, dependencies=[Depends(require_roles(["owner"]))])
async def update_user(
    id: UUID,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Update a user's role or status within the tenant context."""
    user = db.get(User, id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    membership = db.exec(
        select(TenantUser).where(
            TenantUser.user_id == user.id,
            TenantUser.tenant_id == active_tenant_id
        )
    ).first()
    
    if not membership:
        raise HTTPException(status_code=404, detail="User is not a member of this tenant")
    
    if full_name is not None:
        user.full_name = full_name
        db.add(user)
        
    if role is not None:
        membership.tenant_role = role
        db.add(membership)
        
    if is_active is not None:
        membership.is_active = is_active
        db.add(membership)
        
    db.commit()
    db.refresh(user)
    return user
