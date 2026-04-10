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
        url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
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
