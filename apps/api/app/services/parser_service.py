import re
from enum import Enum
from typing import Dict, Any, Optional, Tuple
from sqlmodel import Session, select
from app.core.logging import logger
from app.models.models import (
    Customer,
    Product,
    StockBalance,
    InventoryMovement,
    CustomerBalance,
    Payment,
    WhatsAppMessage,
)


class Intent(str, Enum):
    DELIVERY = "delivery"
    PAYMENT = "payment"
    STOCK_QUERY = "stock_query"
    DEBT_QUERY = "debt_query"
    UNKNOWN = "unknown"


class ParserService:
    """Service to parse WhatsApp messages and trigger domain actions for ChocoBites Pilot."""

    @staticmethod
    def parse_intent(text: str) -> Tuple[Intent, Dict[str, Any]]:
        """Extracts intent and entities (quantity, amount, product_name) from text."""
        text = text.lower().strip()
        entities = {}

        # Regex patterns for simple extraction
        # Example: "Entrega 5 chocolate amargo" or "Pago 500"
        number_match = re.search(r"(\d+)", text)
        value = int(number_match.group(1)) if number_match else 0

        # Heuristics for ChocoBites V1.1
        if any(kw in text for kw in ["entrega", "entregue", "lleve", "venta"]):
            # For delivery, the number is usually quantity
            entities["quantity"] = value
            # Extract product hint (crude keyword matching)
            if "amargo" in text:
                entities["product"] = "amargo"
            elif "leche" in text:
                entities["product"] = "leche"
            return Intent.DELIVERY, entities

        if any(kw in text for kw in ["pago", "abono", "transfer", "efectivo"]):
            # For payment, the number is amount
            entities["amount"] = float(value)
            return Intent.PAYMENT, entities

        if any(kw in text for kw in ["stock", "cuanto hay", "inventario"]):
            return Intent.STOCK_QUERY, entities

        if any(kw in text for kw in ["deuda", "debo", "saldo", "cuanto fal"]):
            return Intent.DEBT_QUERY, entities

        return Intent.UNKNOWN, entities

    @staticmethod
    async def process_message(db: Session, whatsapp_msg: WhatsAppMessage):
        """Orchestrates parsing and database updates matching real business logic."""
        logger.info(
            "Processing business logic from message",
            sender=whatsapp_msg.from_number,
            body=whatsapp_msg.body,
        )

        intent, entities = ParserService.parse_intent(whatsapp_msg.body or "")
        whatsapp_msg.intent = intent.value

        # 1. Identify Customer by Phone Number
        statement = select(Customer).where(
            Customer.phone_number == whatsapp_msg.from_number
        )
        customer = db.exec(statement).first()

        if not customer:
            logger.warning(
                "Message from unregistered number", phone=whatsapp_msg.from_number
            )
            # In V1.1 we assume pilot customers are pre-registered manually or via onboarding
            return "unknown_customer"

        tenant_id = customer.tenant_id

        if intent == Intent.DELIVERY:
            # Handle DELIVERY logic
            qty = entities.get("quantity", 0)
            if qty <= 0:
                return "invalid_quantity"

            # Find product (simplified for pilot)
            product_stmt = select(Product).where(Product.tenant_id == tenant_id)
            # Just take the first product if none specified for now or match hint
            product = db.exec(product_stmt).first()

            if product:
                # Update Stock
                stock_stmt = select(StockBalance).where(
                    StockBalance.product_id == product.id,
                    StockBalance.tenant_id == tenant_id,
                )
                stock = db.exec(stock_stmt).first()
                if stock:
                    stock.quantity -= qty
                    db.add(stock)

                # Record Movement
                movement = InventoryMovement(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    customer_id=customer.id,
                    quantity=-qty,  # Negative for outgoing delivery
                    type="delivery",
                    description=f"WhatsApp Delivery: {whatsapp_msg.body}",
                )
                db.add(movement)

                # Update Customer Balance (negative is debt)
                balance_stmt = select(CustomerBalance).where(
                    CustomerBalance.customer_id == customer.id,
                    CustomerBalance.tenant_id == tenant_id,
                )
                balance = db.exec(balance_stmt).first()
                if not balance:
                    balance = CustomerBalance(
                        tenant_id=tenant_id, customer_id=customer.id, balance=0.0
                    )

                # Each delivery increases debt (decreases balance)
                total_cost = qty * product.price
                balance.balance -= total_cost
                db.add(balance)

                logger.info(
                    "Delivery registered successfully",
                    customer=customer.name,
                    product=product.name,
                    cost=total_cost,
                )

        elif intent == Intent.PAYMENT:
            # Handle PAYMENT logic
            amount = entities.get("amount", 0.0)
            if amount <= 0:
                return "invalid_amount"

            # Create Payment Record
            payment = Payment(
                tenant_id=tenant_id,
                customer_id=customer.id,
                amount=amount,
                method="unspecified",
            )
            db.add(payment)

            # Update Customer Balance (adds to balance, reducing debt)
            balance_stmt = select(CustomerBalance).where(
                CustomerBalance.customer_id == customer.id,
                CustomerBalance.tenant_id == tenant_id,
            )
            balance = db.exec(balance_stmt).first()
            if not balance:
                balance = CustomerBalance(
                    tenant_id=tenant_id, customer_id=customer.id, balance=0.0
                )

            balance.balance += amount
            db.add(balance)

            logger.info(
                "Payment registered successfully", customer=customer.name, amount=amount
            )

        # Mark as processed
        whatsapp_msg.processed = True
        db.add(whatsapp_msg)
        db.commit()

        return intent.value
