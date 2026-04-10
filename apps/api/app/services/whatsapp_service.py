import httpx
import structlog
from app.models.models import WhatsAppConfig, Tenant
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
        # 1. Resolve Credentials
        config = self.db.exec(
            select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == tenant.id)
        ).first()

        if not config or not config.encrypted_access_token:
            logger.warning(
                "whatsapp.receipt_skipped_no_config", tenant_id=str(tenant.id)
            )
            return

        token = decrypt_token(config.encrypted_access_token)
        phone_id = config.meta_phone_number_id

        if not token or not phone_id:
            logger.error(
                "whatsapp.receipt_failed_invalid_credentials", tenant_id=str(tenant.id)
            )
            return

        # 2. Build Human-Friendly Message
        # Logic: If balance is 0 or positive, it's paid.
        # If balance is negative, it's a debt.
        balance_val = data["balance"]
        balance_label = "Saldo pendiente"
        if balance_val >= 0:
            balance_label = "Pagado"

        balance_abs = abs(balance_val)

        message = (
            f"🧾 *Pedido registrado*\n\n"
            f"*Cliente:* {data['customer_name']}\n\n"
            f"*Productos:*\n{data['product_list']}\n\n"
            f"*Total:* ${data['total_amount']:,.2f}\n"
            f"*{balance_label}:* ${balance_abs:,.2f}\n\n"
            f"---\n"
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
