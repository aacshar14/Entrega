from fastapi import Depends, HTTPException, Security, status, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.config import settings
from app.models.models import User, Tenant, TenantUser
from sqlmodel import Session, select

security = HTTPBearer()

def get_db():
    from app.core.db import engine
    with Session(engine) as session:
        yield session

async def get_current_user(
    token: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    """Validates Supabase JWT and retrieves the local global User model."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token.credentials, 
            settings.SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            audience="authenticated"
        )
        supabase_uid: str = payload.get("sub")
        if supabase_uid is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    statement = select(User).where(User.auth_provider_id == supabase_uid)
    user = db.exec(statement).first()
    
    if user is None:
        raise HTTPException(status_code=404, detail="User profile not initialized")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user account")
        
    return user

async def get_active_membership(
    x_tenant_id: Optional[UUID] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> TenantUser:
    """
    Resolves the active membership context.
    Platform admins are granted a 'pseudo-membership' if targeting a tenant.
    """
    # 1. Platform Admin override
    if current_user.platform_role == "admin" and x_tenant_id:
        tenant = db.get(Tenant, x_tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        # Return a mock membership for the admin
        return TenantUser(
            tenant_id=x_tenant_id,
            user_id=current_user.id,
            tenant_role="owner", # Admin acts as owner
            is_active=True
        )

    # 2. Resolve via DB memberships
    membership_stmt = select(TenantUser).where(
        TenantUser.user_id == current_user.id,
        TenantUser.is_active == True
    )
    
    if x_tenant_id:
        membership_stmt = membership_stmt.where(TenantUser.tenant_id == x_tenant_id)
    
    memberships = db.exec(membership_stmt).all()
    if not memberships:
        raise HTTPException(status_code=403, detail="No active membership found")

    # Priority: X-Tenant-Id matched > is_default > First
    membership = next((m for m in memberships if m.is_default), memberships[0])
    if x_tenant_id:
        membership = next((m for m in memberships if m.tenant_id == x_tenant_id), memberships[0])

    return membership

async def get_active_tenant(
    membership: TenantUser = Depends(get_active_membership),
    db: Session = Depends(get_db)
) -> Tenant:
    return db.get(Tenant, membership.tenant_id)

async def get_active_tenant_id(
    membership: TenantUser = Depends(get_active_membership)
) -> UUID:
    return membership.tenant_id

def require_tenant_role(roles: List[str]):
    async def role_dependency(membership: TenantUser = Depends(get_active_membership)):
        if membership.tenant_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {roles}"
            )
        return membership
    return role_dependency

def require_platform_role(authorized_roles: List[str]):
    async def role_dependency(current_user: User = Depends(get_current_user)):
        if current_user.platform_role not in authorized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Platform-level permission denied"
            )
        return current_user
    return role_dependency
