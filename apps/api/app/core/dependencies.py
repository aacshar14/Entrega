from typing import List, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.config import settings
from app.models.models import User, Tenant
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
    """
    Validates Supabase JWT and retrieves the local User model.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # NOTE: In reality, you'd use settings.SUPABASE_JWT_SECRET
        # For this prototype, we decode with secret, or mock if needed.
        # Supabase uses HS256.
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

    # Match Supabase UID with local User auth_provider_ref
    statement = select(User).where(User.auth_provider_ref == supabase_uid)
    user = db.exec(statement).first()
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found in local system")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
        
    return user

async def get_tenant_id(
    current_user: User = Depends(get_current_user)
) -> UUID:
    """
    Extracts the tenant_id from the authenticated user context.
    Ensures that tenant_id is NEVER taken from the client directly.
    """
    return current_user.tenant_id

def require_roles(authorized_roles: List[str]):
    """
    Role-based access control dependency.
    """
    async def role_dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in authorized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role: {current_user.role}"
            )
        return current_user
    return role_dependency
