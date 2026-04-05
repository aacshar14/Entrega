from fastapi import Depends, HTTPException, Security, status, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.utils import base64url_decode
from cryptography.hazmat.primitives.asymmetric import ec
from uuid import UUID
from typing import Optional, List, Any, Dict
import httpx
import time

from app.core.config import settings
from app.models.models import User, Tenant, TenantUser
from sqlmodel import Session, select

security = HTTPBearer(auto_error=False)

# Simple in-memory cache for Supabase JWKS (signing keys)
JWKS_CACHE: Dict[str, Any] = {}
JWKS_LAST_FETCH = 0
JWKS_TTL = 3600  # 1 hour

def build_es256_public_key_from_jwk(jwk: dict):
    """
    EntréGA Security:
    Converts a Supabase JWK dict into a usable EC public key for ES256 signature verification.
    """
    x = base64url_decode(jwk["x"].encode())
    y = base64url_decode(jwk["y"].encode())

    public_numbers = ec.EllipticCurvePublicNumbers(
        int.from_bytes(x, "big"),
        int.from_bytes(y, "big"),
        ec.SECP256R1()
    )
    return public_numbers.public_key()

async def get_jwks():
    """
    Fetches the JSON Web Key Set (JWKS) from Supabase.
    Keys are cached for 1 hour to optimize performance.
    """
    global JWKS_CACHE, JWKS_LAST_FETCH
    
    current_time = time.time()
    if JWKS_CACHE and (current_time - JWKS_LAST_FETCH < JWKS_TTL):
        return JWKS_CACHE
        
    # discovery endpoint path according to OIDC standards
    jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(jwks_url)
            response.raise_for_status()
            JWKS_CACHE = response.json()
            JWKS_LAST_FETCH = current_time
            return JWKS_CACHE
        except Exception as e:
            from app.core.logging import logger
            logger.error("SYSTEM ERROR: Failed to fetch JWKS from Supabase", url=jwks_url, error=str(e))
            return JWKS_CACHE 

def get_db():
    from app.core.db import engine
    with Session(engine) as session:
        yield session

async def get_current_user(
    token: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db)
) -> User:
    """
    EntréGA Authentication Layer:
    1. Validates the incoming Supabase access token (ES256 via JWKS).
    2. Resolves the global User profile using the 'sub' claim (auth_provider_id).
    3. Auto-provisions new profiles for valid identities if not already present.
    """
    from app.core.logging import logger
    
    if not token:
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
        # 1. Inspect metadata without verification to resolve signing key
        unverified_headers = jwt.get_unverified_header(token.credentials)
        unverified_claims = jwt.get_unverified_claims(token.credentials)
        alg = unverified_headers.get("alg")
        received_kid = unverified_headers.get("kid")

        if alg != "ES256":
            logger.error("AUTH FAILURE: Unsupported JWT algorithm. EntréGA strictly requires ES256 (JWKS).", 
                         received_alg=alg)
            raise credentials_exception

        # 2. Fetch/Resolve signing keys
        jwks = await get_jwks()
        if not jwks or "keys" not in jwks:
            logger.error("AUTH ERROR: Supabase signing keys currently unavailable.")
            raise credentials_exception
        
        available_keys = jwks.get("keys", [])
        target_jwk = next((k for k in available_keys if k.get("kid") == received_kid), None)
        
        if not target_jwk:
            logger.error("AUTH FAILURE: Signing key not found in JWKS.", kid=received_kid)
            raise credentials_exception

        # 3. Cryptographic Verification
        # Convert JWK coordinates to a real EC Public Key for industrial-grade signature checking.
        public_key = build_es256_public_key_from_jwk(target_jwk)

        # Standard Supabase claims: aud='authenticated', iss='https://{ref}.supabase.co/auth/v1'
        expected_issuer = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"
        
        payload = jwt.decode(
            token.credentials,
            public_key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=expected_issuer,
            options={"leeway": 60} # Allow 60s of clock desync
        )
        
        if not payload:
            raise credentials_exception
            
        supabase_uid: str = payload.get("sub")
        email: str = payload.get("email")

        if not supabase_uid or not email:
            logger.error("AUTH FAILURE: Required claims (sub/email) missing from token.")
            raise credentials_exception

    except JWTError as e:
        # Standard jose errors (expired, invalid signature, etc)
        logger.error("AUTH FAILURE: JWT verification failed.", error=str(e))
        raise credentials_exception
    except Exception as e:
        # Unexpected system or cryptography errors
        import traceback
        logger.error("SYSTEM ERROR: JWT validation crash.", error=str(e), trace=traceback.format_exc())
        raise credentials_exception

    # 4. Identity Mapping (Global EntréGA Context)
    statement = select(User).where(User.auth_provider_id == supabase_uid)
    user = db.exec(statement).first()
    
    if user is None:
        # Auto-Provisioning logic (e.g. for invited users or new signups)
        existing_user_stmt = select(User).where(User.email == email)
        user = db.exec(existing_user_stmt).first()
        
        if user:
            logger.info("IDENTITY LINK: Linking existing User profile to new auth_provider_id.", 
                        email=email, sub=supabase_uid)
            user.auth_provider_id = supabase_uid
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            import uuid
            user_metadata = payload.get("user_metadata", {})
            full_name = user_metadata.get("full_name") or user_metadata.get("name") or email.split('@')[0]
            
            logger.info("PROVISIONING: Auto-creating new platform profile.", email=email)
            
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
