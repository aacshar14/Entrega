from fastapi import Depends, HTTPException, Security, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from uuid import UUID
from typing import Optional, List, Any, Dict
import httpx
import time
import json

from sqlmodel import Session, select
from app.core.config import settings
import structlog

security = HTTPBearer(auto_error=False)

# Simple in-memory cache for Supabase JWKS (signing keys)
JWKS_CACHE: Dict[str, Any] = {}
JWKS_LAST_FETCH = 0
JWKS_TTL = 3600  # 1 hour


async def get_jwks():
    """
    Fetches the JSON Web Key Set (JWKS) from Supabase.
    Used as a fallback if the local environment key is missing or rotated.
    """
    global JWKS_CACHE, JWKS_LAST_FETCH
    current_time = time.time()
    if JWKS_CACHE and (current_time - JWKS_LAST_FETCH < JWKS_TTL):
        return JWKS_CACHE

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

            logger.error(
                "SYSTEM ERROR: Failed to fetch JWKS from Supabase",
                url=jwks_url,
                error=str(e),
            )
            return JWKS_CACHE


def get_db():
    from app.core.db import engine

    with Session(engine) as session:
        yield session


async def get_current_user(
    request: Request,
    token: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
) -> Any:
    """
    EntréGA Authentication Layer (Hardened ES256):
    Exclusively validates Supabase tokens using Elliptic Curve Cryptography (ES256).
    """
    from app.core.logging import logger

    if not token:
        safe_headers = dict(request.headers)
        if "authorization" in safe_headers:
            safe_headers["authorization"] = "PRESENT [MASKED]"
        logger.warning(
            "AUTH FAILURE: No Bearer token found in request headers",
            headers=safe_headers,
        )
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
        # Determine algorithm
        unverified_headers = jwt.get_unverified_header(token.credentials)
        alg = unverified_headers.get("alg")

        if alg != "ES256":
            logger.error(
                "AUTH FAILURE: Project policy strictly enforces ES256. Received:",
                alg=alg,
            )
            raise credentials_exception

        payload = None
        jwt_secret_raw = settings.SUPABASE_JWT_SECRET

        # 1. Primary: Use local JWK from environment
        if jwt_secret_raw and jwt_secret_raw.strip().startswith("{"):
            try:
                jwk_dict = json.loads(jwt_secret_raw)
                payload = jwt.decode(
                    token.credentials,
                    jwk_dict,
                    algorithms=["ES256"],
                    audience="authenticated",
                    options={"verify_aud": True, "verify_iss": False, "leeway": 60},
                )
                logger.debug("AUTH: Validated via local ES256 key")
            except Exception as e:
                logger.warning(
                    "AUTH: Local ES256 validation failed, attempting remote JWKS",
                    error=str(e),
                )

        # 2. Secondary: Fallback to remote JWKS
        if not payload:
            jwks = await get_jwks()
            kid = unverified_headers.get("kid")
            target_jwk = next(
                (k for k in jwks.get("keys", []) if k.get("kid") == kid), None
            )

            if target_jwk:
                try:
                    payload = jwt.decode(
                        token.credentials,
                        target_jwk,
                        algorithms=["ES256"],
                        audience="authenticated",
                        options={"verify_aud": True, "verify_iss": False, "leeway": 60},
                    )
                    logger.info("AUTH SUCCESS: Validated via Remote JWKS")
                except Exception as e:
                    logger.error(
                        "AUTH FAILURE: ES256 validation failed on both local and remote keys",
                        error=str(e),
                    )
                    raise credentials_exception
            else:
                logger.error("AUTH FAILURE: Signing key not found in JWKS collection")
                raise credentials_exception

        supabase_uid: str = payload.get("sub")
        email: str = payload.get("email")

        if not supabase_uid or not email:
            raise credentials_exception

        # Identity Mapping & Auto-Provisioning
        from app.models.models import User

        user = db.exec(
            select(User).where(User.auth_provider_id == supabase_uid)
        ).first()

        if user is None:
            user = db.exec(select(User).where(User.email == email)).first()
            if user:
                logger.info(
                    "IDENTITY LINK: Binding Supabase Identity to existing User profile",
                    email=email,
                )
                user.auth_provider_id = supabase_uid
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                # Auto-provision user if they don't exist
                logger.info(
                    "PROVISIONING: Creating new local User profile from Supabase identity",
                    email=email,
                )
                user = User(
                    email=email,
                    auth_provider_id=supabase_uid,
                    full_name=payload.get("user_metadata", {}).get("full_name")
                    or email.split("@")[0],
                )
                db.add(user)
                db.commit()
                db.refresh(user)

        # 🛡️ Hardening: Bind user_id to session context (Safe mode V1.9.9)
        try:
            structlog.contextvars.bind_contextvars(user_id=str(user.id))
        except:
            pass

        if user.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Inactive account"
            )

        return user

    except HTTPException:
        raise
    except Exception as e:
        from app.core.logging import logger

        logger.error("AUTH SYSTEM ERROR", error=str(e))
        raise credentials_exception


async def get_active_membership(
    request: Request,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Optional[Any]:
    """
    STRICT RESOLUTION (V2.2.0): Deterministic tenant context resolution.
    Follows precedence: Header -> Default -> Oldest Membership.
    """
    from app.models.models import TenantUser, Tenant
    from app.core.logging import logger

    header_tenant_id = request.headers.get("X-Tenant-Id")

    # 1. Platform Admin: No header = No tenant context (Global)
    if current_user.platform_role == "admin":
        if not header_tenant_id:
            logger.info("tenant_resolution.admin_global", user_id=str(current_user.id))
            return None

        # Admin with header: Force validation
        try:
            target_id = UUID(header_tenant_id)
            tenant = db.get(Tenant, target_id)
            if not tenant:
                raise HTTPException(status_code=404, detail="Tenant not found")

            membership = TenantUser(
                tenant_id=target_id,
                user_id=current_user.id,
                tenant_role="owner",
                is_active=True,
            )
            logger.info("tenant_resolution.admin_header_bypass", tenant_id=str(target_id))
            structlog.contextvars.bind_contextvars(tenant_id=str(target_id))
            return membership
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid X-Tenant-Id format")

    # 2. Standard User with Header: Strict Validation (403 if unauthorized)
    if header_tenant_id:
        try:
            target_id = UUID(header_tenant_id)
            membership = db.exec(
                select(TenantUser).where(
                    TenantUser.user_id == current_user.id,
                    TenantUser.tenant_id == target_id,
                    TenantUser.is_active.is_not(False),
                )
            ).first()

            if not membership:
                logger.warning("tenant_resolution.unauthorized", user_id=str(current_user.id), requested=header_tenant_id)
                raise HTTPException(status_code=403, detail="Unauthorized tenant context")

            structlog.contextvars.bind_contextvars(tenant_id=str(target_id))
            return membership
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid X-Tenant-Id format")

    # 3. Standard User without Header: Fallback Precedence
    # order: is_default DESC, created_at ASC (oldest), id ASC (tie-breaker)
    membership = db.exec(
        select(TenantUser)
        .where(TenantUser.user_id == current_user.id, TenantUser.is_active.is_not(False))
        .order_by(
            TenantUser.is_default.desc(),
            TenantUser.created_at.asc(),
            TenantUser.tenant_id.asc(),
        )
    ).first()

    if membership:
        logger.info("tenant_resolution.fallback_success", user_id=str(current_user.id), tenant_id=str(membership.tenant_id))
        structlog.contextvars.bind_contextvars(tenant_id=str(membership.tenant_id))
        return membership

    return None


async def get_active_tenant(
    membership: Any = Depends(get_active_membership), db: Session = Depends(get_db)
) -> Any:
    if not membership:
        raise HTTPException(status_code=400, detail="No active tenant context")
    from app.models.models import Tenant

    return db.get(Tenant, membership.tenant_id)


async def get_active_tenant_id(
    membership: Any = Depends(get_active_membership),
) -> UUID:
    if not membership:
        raise HTTPException(status_code=400, detail="No active tenant context")
    return membership.tenant_id


async def get_optional_active_tenant_id(
    request: Request,
) -> Optional[UUID]:
    """
    Non-blocking tenant resolution from Header.
    Returns the UUID if a valid format is found, otherwise returns None.
    Essential for notification scoping (Platform vs Tenant).
    """
    header_tenant_id = request.headers.get("X-Tenant-Id")
    if not header_tenant_id:
        return None

    try:
        return UUID(header_tenant_id)
    except:
        return None


def require_tenant_role(roles: List[str]):
    async def role_dependency(
        membership: Any = Depends(get_active_membership),
        current_user: Any = Depends(get_current_user),
    ):
        # 👑 Superuser Bypass: Platform admins navigate all tenant contexts
        if current_user.platform_role == "admin":
            return membership

        if not membership or membership.tenant_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
            )
        return membership

    return role_dependency


def require_platform_role(authorized_roles: List[str]):
    async def role_dependency(current_user: Any = Depends(get_current_user)):
        if current_user.platform_role not in authorized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
            )
        return current_user

    return role_dependency


async def require_active_billing(
    db: Session = Depends(get_db),
    membership: Any = Depends(get_active_membership),
) -> Tenant:
    """
    STRICT ENFORCEMENT (V2.5.0): Ensures tenant has basic access to dashboard/orders.
    """
    from app.models.models import Tenant
    from app.core.billing import BillingResolver

    if not membership:
        raise HTTPException(status_code=400, detail="No active tenant context")

    tenant = db.get(Tenant, membership.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    billing = BillingResolver.resolve_billing(tenant)
    if not billing.entitlements.can_access_dashboard:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Acceso restringido. Por favor regulariza tu suscripción o contacta a soporte.",
        )

    return tenant


async def require_whatsapp_entitlement(
    db: Session = Depends(get_db),
    membership: Any = Depends(get_active_membership),
) -> Tenant:
    """
    STRICT ENFORCEMENT (V2.5.0): Validates capacity to use WhatsApp automation.
    """
    from app.models.models import Tenant
    from app.core.billing import BillingResolver

    tenant = await require_active_billing(db, membership)
    billing = BillingResolver.resolve_billing(tenant)

    if not billing.entitlements.can_process_whatsapp:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Capacidad de procesamiento de WhatsApp suspendida. Revisa tu facturación.",
        )

    return tenant


async def require_premium(
    db: Session = Depends(get_db),
    membership: Any = Depends(get_active_membership),
) -> Tenant:
    """
    Entitlement Guard (V2.5.0): Requires full paid plan features (vía can_export).
    """
    from app.models.models import Tenant
    from app.core.billing import BillingResolver

    tenant = await require_active_billing(db, membership)
    billing = BillingResolver.resolve_billing(tenant)

    if not billing.entitlements.can_export:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Se requiere un plan Premium activo para esta función avanzada.",
        )

    return tenant


# Backward Compatibility & Logic Aliases
require_roles = require_tenant_role


async def get_current_user_id(current_user: Any = Depends(get_current_user)) -> UUID:
    """
    Utility dependency to extract only the UUID from the authenticated user context.
    """
    return current_user.id
