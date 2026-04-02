import re
import json
from typing import Optional, Dict, List
from uuid import UUID
from sqlmodel import Session, select
from datetime import datetime, timezone

from app.models.models import Customer, Product, CustomerAlias, ProductAlias, MessageLog, Tenant

class ParsingEngine:
    """
    Estrategia v1: Simple Base Parser + Matching contra Aliases del Tenant.
    No forzar lenguaje técnico. Priorizar aprendizaje.
    """
    
    def __init__(self, session: Session, tenant: Tenant):
        self.session = session
        self.tenant = tenant

    def parse_message(self, sender: str, raw_text: str) -> MessageLog:
        """
        Main entry point for parsing messages and logging them for review.
        """
        text = raw_text.lower().strip()
        entities = {}
        intent = "unknown"
        confidence = 0.0
        needs_confirmation = False

        # 1. Match Customer Aliases
        customer_id = self._match_customer(text)
        if customer_id:
            entities["customer_id"] = str(customer_id)
            confidence += 0.4

        # 2. Match Product Aliases
        product_id = self._match_product(text)
        if product_id:
            entities["product_id"] = str(product_id)
            confidence += 0.3

        # 3. Detect Amount/Quantity (Simple regex)
        # Matches "$100", "100.00", etc.
        amount_match = re.search(r'\$?(\d+(\.\d+)?)', text)
        if amount_match:
            entities["amount"] = float(amount_match.group(1))
            confidence += 0.2

        # 4. Infer Intent
        if "amount" in entities and "customer_id" in entities and not "product_id" in entities:
            intent = "payment"
        elif "customer_id" in entities and "product_id" in entities:
            intent = "delivery"
        elif "product_id" in entities and not "customer_id" in entities:
            intent = "stock"

        # 5. UX: Needs Confirmation?
        if confidence < 0.7 or intent == "unknown":
            needs_confirmation = True

        # 6. Logging Estructurado (Requirement 1)
        log = MessageLog(
            tenant_id=self.tenant.id,
            sender=sender,
            raw_message=raw_text,
            detected_intent=intent,
            detected_entities=json.dumps(entities),
            confidence=confidence,
            needs_confirmation=needs_confirmation,
            final_status="pending"
        )
        self.session.add(log)
        self.session.commit()
        self.session.refresh(log)
        
        return log

    def _match_customer(self, text: str) -> Optional[UUID]:
        # Direct Alias Match
        aliases = self.session.exec(
            select(CustomerAlias).where(CustomerAlias.tenant_id == self.tenant.id)
        ).all()
        for a in aliases:
            if a.alias in text:
                return a.customer_id
        
        # Simple string match against real customer names
        customers = self.session.exec(
            select(Customer).where(Customer.tenant_id == self.tenant.id)
        ).all()
        for c in customers:
            if c.name.lower() in text:
                return c.id
        return None

    def _match_product(self, text: str) -> Optional[UUID]:
        # Direct Alias Match
        aliases = self.session.exec(
            select(ProductAlias).where(ProductAlias.tenant_id == self.tenant.id)
        ).all()
        for a in aliases:
            if a.alias in text:
                return a.product_id
        
        # Simple string match against real product names
        products = self.session.exec(
            select(Product).where(Product.tenant_id == self.tenant.id)
        ).all()
        for p in products:
            if p.name.lower() in text:
                return p.id
        return None
