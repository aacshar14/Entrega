import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.models.models import Tenant, TenantWhatsAppIntegration, WhatsAppMessage
from sqlmodel import Session, select

client = TestClient(app)

def test_webhook_routing_and_idempotency(db_session: Session):
    # 1. Setup Tenant & Integration
    tenant = Tenant(name="Test Tenant", slug="test-tenant")
    db_session.add(tenant)
    db_session.commit()
    
    integration = TenantWhatsAppIntegration(
        tenant_id=tenant.id,
        phone_number_id="123456789",
        status="connected"
    )
    db_session.add(integration)
    db_session.commit()
    
    # 2. Mock Payload from Meta
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "WABA_ID",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"display_phone_number": "123", "phone_number_id": "123456789"},
                    "messages": [{
                        "from": "5215551234567",
                        "id": "TEST_MSG_ID_001",
                        "timestamp": "1625021234",
                        "text": {"body": "Juan me pagó 500"},
                        "type": "text"
                    }]
                },
                "field": "messages"
            }]
        }]
    }
    
    # 3. First Call (Processing)
    with patch("app.core.config.settings.ALLOW_INSECURE_WEBHOOKS", True):
        response = client.post("/api/v1/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        assert response.json() == {"status": "accepted"}
        
    # 4. Verify Identity Persistence
    msg = db_session.exec(select(WhatsAppMessage).where(WhatsAppMessage.message_sid == "TEST_MSG_ID_001")).first()
    assert msg is not None
    assert msg.tenant_id == tenant.id
    assert msg.processing_status == "pending"
    
    # 5. Second Call (Duplicate)
    with patch("app.core.config.settings.ALLOW_INSECURE_WEBHOOKS", True):
        response = client.post("/api/v1/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        # Should be ignored by webhook idempotency check
        assert response.json() == {"status": "accepted"}

def test_parsing_delivery_and_payment():
    from app.core.parser import ParsingEngine
    from app.models.models import Product, Customer
    
    mock_session = MagicMock()
    mock_tenant = Tenant(id="TENANT_ID")
    
    engine = ParsingEngine(mock_session, mock_tenant)
    
    # Test Payment Parsing
    payment = engine.parse_payment("Juan me pagó 500.50")
    assert payment["type"] == "payment"
    assert payment["amount"] == 500.50
    
    # Test Delivery Parsing (Generic number pattern)
    # Mocking inventory response
    mock_prod = Product(sku="CHOC", name="Chocolate", price_menudeo=20.0, tenant_id=mock_tenant.id)
    mock_session.exec.return_value.all.return_value = [mock_prod]
    mock_session.exec.return_value.first.return_value = None # No aliases
    
    items = engine.parse_order("Le dejé 10 de chocolate a Pedro")
    assert len(items) == 1
    assert items[0]["sku"] == "CHOC"
    assert items[0]["qty"] == 10
