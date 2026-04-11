import httpx
import structlog
from app.models.models import TenantWhatsAppIntegration, Tenant
from app.core.security import decrypt_token
from sqlmodel import Session, select
from typing import Dict, Any

logger = structlog.get_logger()


class WhatsAppService:
    def __init__(self, db: Session):
        self.db = db

    async def discover_onboarding_assets(self, access_token: str) -> Dict[str, Any]:
        """
        Surgically resolves WABA and Phone identifiers from Meta Graph API.
        Enforces Level 2 compliance: NO SILENT AUTO-PICK in multi-WABA cases.
        """
        async with httpx.AsyncClient() as client:
            # 1. Resolve WABA from User context using v22.0
            me_resp = await client.get(
                "https://graph.facebook.com/v22.0/me",
                params={
                    "fields": "businesses{owned_whatsapp_business_accounts{id,name}}",
                    "access_token": access_token,
                },
            )
            me_resp.raise_for_status()

            businesses = me_resp.json().get("businesses", {}).get("data", [])
            if not businesses:
                raise ValueError(
                    "No se encontraron Business Manager vinculados en Meta."
                )

            # 2. Aggregate ALL unique WABAs across all reachable businesses
            all_wabas = []
            biz_map = {}  # waba_id -> business_id mapping

            for biz in businesses:
                w_accounts = biz.get("owned_whatsapp_business_accounts", {}).get(
                    "data", []
                )
                for wa in w_accounts:
                    wa_id = wa["id"]
                    if wa_id not in [w["id"] for w in all_wabas]:
                        all_wabas.append(wa)
                        biz_map[wa_id] = biz["id"]

            # 3. Hardened Ambiguity Guard (Level 2)
            if not all_wabas:
                raise ValueError(
                    "No se encontró una WhatsApp Business Account (WABA) activa."
                )

            if len(all_wabas) > 1:
                logger.warning(
                    "whatsapp_onboarding.multiple_waba_detected", count=len(all_wabas)
                )
                # Explciit failure as per requirements
                raise ValueError(
                    f"MULTIPLE_WABA_DETECTED: Se detectaron {len(all_wabas)} cuentas. "
                    "Se requiere selección manual."
                )

            selected_waba = all_wabas[0]
            waba_id = selected_waba["id"]
            business_id = biz_map[waba_id]

            # 4. Resolve Primary Phone for the specific WABA
            phone_resp = await client.get(
                f"https://graph.facebook.com/v22.0/{waba_id}/phone_numbers",
                params={"access_token": access_token},
            )
            phone_resp.raise_for_status()

            phones = phone_resp.json().get("data", [])
            if not phones:
                raise ValueError(
                    "La cuenta de WhatsApp seleccionada no tiene números de teléfono registrados."
                )

            # Extract first primary phone identifier
            # (V22.0 usually returns display_phone_number and id)
            primary_phone = phones[0]

            return {
                "waba_id": waba_id,
                "phone_number_id": primary_phone["id"],
                "business_name": selected_waba["name"],
                "display_phone_number": primary_phone.get("display_phone_number"),
                "business_account_id": business_id,
            }

    def send_order_receipt(self, tenant: Tenant, data: Dict[str, Any]):
        """
        Sends an automated order receipt via Meta Cloud API.
        Deterministic formatting aligned with Entrega branding.
        """
        # 1. Resolve Credentials (V1.4 Unified)
        config = self.db.exec(
            select(TenantWhatsAppIntegration).where(
                TenantWhatsAppIntegration.tenant_id == tenant.id
            )
        ).first()

        if not config or not config.access_token_encrypted:
            logger.warning(
                "whatsapp.receipt_skipped_no_config", tenant_id=str(tenant.id)
            )
            return

        token = decrypt_token(config.access_token_encrypted)
        phone_id = config.phone_number_id

        if not token or not phone_id:
            logger.error(
                "whatsapp.receipt_failed_invalid_credentials", tenant_id=str(tenant.id)
            )
            return

        message = (
            f"🧾 *Pedido registrado*\n\n"
            f"Cliente: {data['customer_name']}\n\n"
            f"Productos:\n{data['product_list']}\n\n"
            f"Total: ${int(data['total_amount']) if data['total_amount'] % 1 == 0 else data['total_amount']}\n\n"
            f"—\n"
            f"Entrega 🚀"
        )

        # 3. Dispatch to Meta
        url = f"https://graph.facebook.com/v22.0/{phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": data["to_number"],
            "type": "text",
            "text": {"body": message},
        }

        # Use synchronous client for worker context compatibility
        with httpx.Client() as client:
            try:
                response = client.post(url, headers=headers, json=payload, timeout=10.0)
                if response.status_code in [401, 403]:
                    logger.error("whatsapp.auth_failure", tenant_id=str(tenant.id))
                    # Mark integration as expired (V1.4 Unified logic)
                    integration = self.db.exec(
                        select(TenantWhatsAppIntegration).where(
                            TenantWhatsAppIntegration.tenant_id == tenant.id
                        )
                    ).first()
                    if integration:
                        integration.status = "token_expired"
                        self.db.add(integration)
                        self.db.commit()

                if response.status_code != 200:
                    logger.error(
                        "whatsapp.api_error",
                        status=response.status_code,
                        body=response.text,
                        tenant_id=str(tenant.id),
                    )
                else:
                    logger.info(
                        "whatsapp.receipt_sent",
                        tenant_id=str(tenant.id),
                        to=data["to_number"],
                    )
            except Exception as e:
                logger.error(
                    "whatsapp.dispatch_failed", error=str(e), tenant_id=str(tenant.id)
                )

    def send_payment_receipt(self, tenant: Tenant, data: Dict[str, Any]):
        """
        Sends an automated payment confirmation via Meta Cloud API.
        """
        config = self.db.exec(
            select(TenantWhatsAppIntegration).where(
                TenantWhatsAppIntegration.tenant_id == tenant.id
            )
        ).first()

        if not config or not config.access_token_encrypted:
            return

        token = decrypt_token(config.access_token_encrypted)
        phone_id = config.phone_number_id

        message = (
            f"✅ *Pago registrado*\n\n"
            f"Cliente: {data['customer_name']}\n"
            f"Monto: ${data['amount_received']}\n"
            f"Nuevo Saldo: ${data['balance']}\n\n"
            f"—\n"
            f"Entrega 🚀"
        )

        url = f"https://graph.facebook.com/v22.0/{phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": data["to_number"],
            "type": "text",
            "text": {"body": message},
        }

        with httpx.Client() as client:
            try:
                client.post(url, headers=headers, json=payload, timeout=10.0)
            except Exception:
                pass
