from app.services.whatsapp_service import WhatsAppService
import httpx
import json

router = APIRouter()


class WhatsAppCompleteRequest(BaseModel):
    code: str
    state: str  # The secure nonce
    waba_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    business_name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/whatsapp/complete")
async def complete_whatsapp_integration(
    payload: WhatsAppCompleteRequest,
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """
    Handles Meta Embedded Signup completion.
    Exchanges code for long-lived token (v22.0) and performs asset discovery.
    """
    logger.info(
        "whatsapp_integration.complete_start",
        tenant_id=str(active_tenant_id),
        user_id=str(current_user.id),
    )

    # 1. Fetch Integration Row (Support for existing or new first-time tenants)
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    # 2. Strict Security Check: Nonce must match current session intent
    if not integration or integration.onboarding_nonce != payload.state:
        logger.error(
            "whatsapp_integration.nonce_validation_failed",
            tenant_id=str(active_tenant_id),
        )
        raise HTTPException(
            status_code=403, detail="Sesión de vinculación inválida o expirada."
        )

    # Expiry Check (15m window)
    if integration.onboarding_nonce_expires_at and datetime.now(
        timezone.utc
    ) > integration.onboarding_nonce_expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(
            status_code=403, detail="La sesión ha expirado. Por favor intente de nuevo."
        )

    try:
        # 3. Meta Code Exchange (v22.0) - No longer using hardcoded v19.0
        async with httpx.AsyncClient() as client:
            fb_response = await client.get(
                "https://graph.facebook.com/v22.0/oauth/access_token",
                params={
                    "client_id": settings.WHATSAPP_APP_ID,
                    "client_secret": settings.WHATSAPP_APP_SECRET,
                    "code": payload.code,
                },
            )

            if fb_response.status_code != 200:
                logger.error(
                    "token_exchange.failed",
                    status=fb_response.status_code,
                    body=fb_response.text,
                )
                raise ValueError("Meta Code Exchange failed: Authorization invalid.")

            data = fb_response.json()
            access_token = data.get("access_token")

            # 4. Assets Discovery (Level 2 Enforcement: Do NOT trust frontend payload)
            ws = WhatsAppService(db)
            assets = await ws.discover_onboarding_assets(access_token)

            # 5. Collision Check (Unique phone_number_id across tenants)
            collision = db.exec(
                select(TenantWhatsAppIntegration)
                .where(
                    TenantWhatsAppIntegration.phone_number_id
                    == assets["phone_number_id"]
                )
                .where(TenantWhatsAppIntegration.tenant_id != active_tenant_id)
            ).first()

            if collision:
                logger.error(
                    "whatsapp_onboarding.collision_detected",
                    phone_number_id=assets["phone_number_id"],
                    tenant_id=str(active_tenant_id),
                )
                raise ValueError(
                    "Este número de WhatsApp ya se encuentra vinculado a otro comercio."
                )

            # 6. Atomic Persistence (Unified status sync)
            integration.waba_id = assets["waba_id"]
            integration.phone_number_id = assets["phone_number_id"]
            integration.business_account_id = assets["business_account_id"]
            integration.business_name = assets["business_name"]
            integration.display_phone_number = assets["display_phone_number"]

            integration.meta_app_id = settings.WHATSAPP_APP_ID
            integration.configuration_id = settings.WHATSAPP_CONFIG_ID
            integration.access_token_encrypted = encrypt_token(access_token)

            integration.status = "connected"
            integration.onboarding_status = "connected"
            integration.setup_completed = True
            integration.connected_at = datetime.now(timezone.utc)
            integration.last_validated_at = datetime.now(timezone.utc)
            integration.onboarding_nonce = None
            integration.onboarding_nonce_expires_at = None
            integration.updated_at = datetime.now(timezone.utc)

            # 7. Global Tenant Update (Sync for UI/SaaS consistency)
            tenant = db.get(Tenant, active_tenant_id)
            if tenant:
                tenant.business_whatsapp_connected = True
                tenant.whatsapp_status = "connected"
                db.add(tenant)

            db.add(integration)
            db.commit()

            logger.info("whatsapp_onboarding.success", tenant_id=str(active_tenant_id))
            return {"status": "success", "setup_completed": True}

    except Exception as e:
        db.rollback()
        error_msg = str(e)
        logger.error(
            "whatsapp_onboarding.failed",
            error=error_msg,
            tenant_id=str(active_tenant_id),
        )

        # PERSIST FAILURE (For observability)
        if integration:
            integration.status = "failed"
            integration.onboarding_status = "failed"
            integration.metadata_json = json.dumps({"terminal_error": error_msg})
            db.add(integration)
            db.commit()

        # Specific user-facing messages
        if "MULTIPLE_WABA_DETECTED" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Múltiples cuentas detectadas. Por favor configure Meta para usar una sola WABA.",
            )

        raise HTTPException(status_code=400, detail=error_msg)


@router.get("/whatsapp/onboarding-url")
def get_onboarding_url(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """Generates a secure state nonce for Meta Embedded Signup (V1.4)"""
    import secrets
    from datetime import timedelta

    nonce = secrets.token_urlsafe(32)

    # Store nonce in integration record (create if missing as 'pending')
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration:
        integration = TenantWhatsAppIntegration(
            tenant_id=active_tenant_id, status="pending"
        )

    integration.onboarding_nonce = nonce
    integration.onboarding_nonce_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=15
    )
    db.add(integration)
    db.commit()

    return {"nonce": nonce, "app_id": settings.WHATSAPP_APP_ID}


@router.post("/whatsapp/disconnect")
async def disconnect_whatsapp(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """Soft-disables the WhatsApp integration (LifeCycle V1.4)"""
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration.status = "disconnected"
    integration.disconnected_at = datetime.now(timezone.utc)
    db.add(integration)
    db.commit()

    return {"status": "success", "message": "Integración suspendida"}


@router.get("/whatsapp/status")
async def get_whatsapp_status(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """Returns enriched status. Shows 'not_connected' if no record exists."""
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration:
        return {"status": "not_connected"}

    return {
        "status": integration.status,
        "business_name": integration.business_name,
        "phone_number_id": integration.phone_number_id,
        "connected_at": integration.connected_at,
        "last_validated": integration.last_validated_at,
        "disconnected_at": integration.disconnected_at,
    }
