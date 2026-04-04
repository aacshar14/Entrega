from fastapi import Depends, HTTPException, Security, status, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from uuid import UUID
from typing import Optional, List, Any, Dict
import httpx
import time

from app.core.config import settings
from app.models.models import User, Tenant, TenantUser
from sqlmodel import Session, select

security = HTTPBearer(auto_error=False)

# Simple in-memory cache for JWKS
JWKS_CACHE: Dict[str, Any] = {}
JWKS_LAST_FETCH = 0
JWKS_TTL = 3600  # 1 hour

async def get_jwks():
    global JWKS_CACHE, JWKS_LAST_FETCH
    
    current_time = time.time()
    if JWKS_CACHE and (current_time - JWKS_LAST_FETCH < JWKS_TTL):
        return JWKS_CACHE
        
    jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/jwks.json"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(jwks_url)
            response.raise_for_status()
            JWKS_CACHE = response.json()
            JWKS_LAST_FETCH = current_time
            return JWKS_CACHE
        except Exception as e:
            from app.core.logging import logger
            logger.error("Failed to fetch JWKS from Supabase", url=jwks_url, error=str(e))
            return JWKS_CACHE # Return stale cache if fetch fails

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

    # Diagnosis of core settings for validation
    logger.info("[AUTH DEBUG] Validation environment", 
                url_len=len(settings.SUPABASE_URL), 
                url_prefix=settings.SUPABASE_URL[:15],
                jwt_secret_len=len(settings.SUPABASE_JWT_SECRET))

    try:
        # 1. Inspect headers to determine algorithm
        unverified_headers = jwt.get_unverified_header(token.credentials)
        unverified_claims = jwt.get_unverified_claims(token.credentials)
        alg = unverified_headers.get("alg")
        
        logger.info("[AUTH DEBUG] JWT Detected metaclaims", 
                    alg=alg, 
                    aud=unverified_claims.get("aud"),
                    iss=unverified_claims.get("iss"),
                    kid=unverified_headers.get("kid"))

        payload = None
        
        if alg == "ES256":
            # Modern Supabase ES256 validation via JWKS
            jwks = await get_jwks()
            if not jwks or "keys" not in jwks:
                logger.error("JWT Validation failed: JWKS retrieval returned empty or invalid set", jwks_keys=list(jwks.keys()) if jwks else None)
                raise credentials_exception
            
            # Diagnostic for KID matching
            received_kid = unverified_headers.get("kid")
            available_kids = [k.get("kid") for k in jwks.get("keys", [])]
            
            logger.info("[AUTH DEBUG] Public Key Resolution", 
                        received_kid=received_kid, 
                        available_kids=available_kids,
                        matched=(received_kid in available_kids))

            payload = jwt.decode(
                token.credentials,
                jwks,
                algorithms=["ES256"],
                audience="authenticated"
            )
        else:
            # Fallback to HS256 Legacy
            raw_secret = settings.SUPABASE_JWT_SECRET.strip()
            import base64
            try:
                decoded_secret = base64.b64decode(raw_secret)
            except Exception:
                decoded_secret = raw_secret

            payload = jwt.decode(
                token.credentials, 
                decoded_secret, 
                algorithms=["HS256"],
                audience="authenticated"
            )
            
        if not payload:
            logger.error("JWT Validation failed: Decoded payload is null")
            raise credentials_exception
            
        supabase_uid: str = payload.get("sub")
        email: str = payload.get("email")
        
        logger.info("[AUTH DEBUG] JWT SUCCESS", sub=supabase_uid, email=email)

        if not supabase_uid:
            logger.error("JWT Validation failed: 'sub' claim missing from payload")
            raise credentials_exception

    except JWTError as e:
        logger.error("JWT VERIFICATION FAILED (Jose Exception)", 
                     error_class=type(e).__name__,
                     error_message=str(e),
                     received_alg=unverified_headers.get("alg") if 'unverified_headers' in locals() else None)
        raise credentials_exception
    except Exception as e:
        logger.error("SYSTEM ERROR DURING JWT VALIDATION", error_class=type(e).__name__, error_message=str(e))
        raise credentials_exception

    # Identity Resolution
    statement = select(User).where(User.auth_provider_id == supabase_uid)
    user = db.exec(statement).first()
    
    if user is None:
        # Sync via email if auth_provider_id is missing (pre-seeded users)
        existing_user_stmt = select(User).where(User.email == email)
        user = db.exec(existing_user_stmt).first()
        
        if user:
            logger.info("Existing user found by email. Linking auth_provider_id.", 
                        email=email, supabase_uid=supabase_uid)
            user.auth_provider_id = supabase_uid
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            import uuid
            user_metadata = payload.get("user_metadata", {})
            full_name = user_metadata.get("full_name") or user_metadata.get("name") or email.split('@')[0]
            
            logger.info("Brand new user detected. Auto-creating profile.", email=email)
            
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
        
    return user

async def get_active_membership(
    x_tenant_id: Optional[UUID] = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Optional[TenantUser]:
    """Resolves active membership context for users or platform admins."""
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
        return None

    membership_stmt = select(TenantUser).where(
        TenantUser.user_id == current_user.id,
        TenantUser.is_active == True
    )
    
    if x_tenant_id:
        membership_stmt = membership_stmt.where(TenantUser.tenant_id == x_tenant_id)
    
    memberships = db.exec(membership_stmt).all()
    if not memberships:
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
    if not membership:
        raise HTTPException(status_code=400, detail="No active tenant context")
    return db.get(Tenant, membership.tenant_id)

async def get_active_tenant_id(
    membership: TenantUser = Depends(get_active_membership)
) -> UUID:
    if not membership:
        raise HTTPException(status_code=400, detail="No active tenant context")
    return membership.tenant_id

def require_tenant_role(roles: List[str]):
    async def role_dependency(membership: TenantUser = Depends(get_active_membership)):
        if not membership or membership.tenant_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {roles}"
            )
        return membership
    return role_dependency

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
