from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_membership, require_roles
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
    has_wa = tenant.business_whatsapp_number is not None and len(tenant.business_whatsapp_number) > 5

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
    # Fetch all user memberships
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

@router.get("/", response_model=List[User], dependencies=[Depends(require_roles(["owner"]))])
async def list_users(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all users for the tenant (owner only)."""
    users = db.exec(
        select(User).where(User.tenant_id == current_user.tenant_id)
    ).all()
    return users

@router.post("/", response_model=User, dependencies=[Depends(require_roles(["owner"]))])
async def create_user(
    email: str,
    full_name: str,
    role: str = "operator",
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new user (owner only)."""
    new_user = User(
        tenant_id=current_user.tenant_id,
        email=email,
        full_name=full_name,
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.patch("/{id}", response_model=User, dependencies=[Depends(require_roles(["owner"]))])
async def update_user(
    id: UUID,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update a user (owner only)."""
    user = db.get(User, id)
    if not user or user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    if full_name is not None:
        user.full_name = full_name
    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
