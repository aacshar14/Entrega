from fastapi import Depends, HTTPException, Security, status, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from uuid import UUID
from typing import Optional, List

from app.core.config import settings
from app.models.models import User, Tenant, TenantUser
from sqlmodel import Session, select

security = HTTPBearer(auto_error=False)

def get_db():
    from app.core.db import engine
    with Session(engine) as session:
        yield session

async def get_current_user(
    token: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db)
) -> User:
    """Validates Supabase JWT and retrieves the local global User model."""
    from app.core.logging import logger
    
    try:
        if not token:
            logger.error("Authentication failed: No token provided in headers")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            # Check if we are using an ES256 JWK from modern Supabase projects
            raw_secret = settings.SUPABASE_JWT_SECRET.strip()
            if raw_secret.startswith('{'):
                import json
                decoded_secret = json.loads(raw_secret)
                algorithm = "ES256"
            else:
                # Fallback to Legacy HS256
                import base64
                algorithm = "HS256"
                try:
                    # Note: b64decode handles strings with == padding
                    decoded_secret = base64.b64decode(raw_secret)
                except Exception:
                    decoded_secret = raw_secret

            payload = jwt.decode(
                token.credentials, 
                decoded_secret, 
                algorithms=[algorithm],
                audience="authenticated"
            )
            supabase_uid: str = payload.get("sub")
            if supabase_uid is None:
                logger.error("JWT Validation failed: 'sub' claim missing")
                raise credentials_exception
        except JWTError as e:
            logger.error("JWT Validation failed", error=str(e), algorithm=algorithm if 'algorithm' in locals() else "unknown")
            raise credentials_exception

        statement = select(User).where(User.auth_provider_id == supabase_uid)
        user = db.exec(statement).first()
        
        if user is None:
            # 1. Sync Logic: User might exist but lacks auth_provider_id (e.g. pre-seeded)
            email = payload.get("email")
            existing_user_stmt = select(User).where(User.email == email)
            user = db.exec(existing_user_stmt).first()
            
            if user:
                logger.info("Existing user found by email. Linking auth_provider_id.", 
                            email=email, 
                            supabase_uid=supabase_uid)
                user.auth_provider_id = supabase_uid
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                # 2. Creation Logic: Genuine new user
                import uuid
                user_metadata = payload.get("user_metadata", {})
                full_name = user_metadata.get("full_name") or user_metadata.get("name") or email.split('@')[0]
                
                logger.info("Brand new user detected. Auto-creating profile.", 
                            email=email, 
                            supabase_uid=supabase_uid)
                
                user = User(
                    id=uuid.uuid4(),
                    email=email,
                    full_name=full_name,
                    auth_provider_id=supabase_uid,
                    platform_role="user",
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
        
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Inactive user account")
            
        return user
    except Exception as fatal_error:
        import traceback
        logger.error("FATAL ERROR in get_current_user", 
                     error=str(fatal_error), 
                     trace=traceback.format_exc())
        if isinstance(fatal_error, HTTPException):
            raise fatal_error
        raise HTTPException(status_code=500, detail=str(fatal_error))

async def get_active_membership(
    x_tenant_id: Optional[UUID] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Optional[TenantUser]:
    """
    Resolves the active membership context.
    Platform admins are granted a 'pseudo-membership' if targeting a tenant.
    """
    # 1. Platform Admin logic
    if current_user.platform_role == "admin":
        if x_tenant_id:
            tenant = db.get(Tenant, x_tenant_id)
            if not tenant:
                raise HTTPException(status_code=404, detail="Tenant not found")
            return TenantUser(
                tenant_id=x_tenant_id,
                user_id=current_user.id,
                tenant_role="owner", 
                is_active=True
            )
        else:
            # If admin has no X-Tenant-Id, we check how many tenants exist.
            # If they belong to multiple, return None so UI can show selector.
            return None

    # 2. Resolve via DB memberships for regular users
    membership_stmt = select(TenantUser).where(
        TenantUser.user_id == current_user.id,
        TenantUser.is_active == True
    )
    
    if x_tenant_id:
        membership_stmt = membership_stmt.where(TenantUser.tenant_id == x_tenant_id)
    
    memberships = db.exec(membership_stmt).all()
    if not memberships:
        # If user has no memberships at all, return None (might need to onboard)
        return None

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

# Alias for backward compatibility
require_roles = require_tenant_role

def require_platform_role(authorized_roles: List[str]):
    async def role_dependency(current_user: User = Depends(get_current_user)):
        if current_user.platform_role not in authorized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Platform-level permission denied"
            )
        return current_user
    return role_dependency
