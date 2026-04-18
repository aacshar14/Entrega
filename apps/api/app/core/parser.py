import re
import json
import unicodedata
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Any
from sqlmodel import Session, select
from app.models.models import (
    Customer,
    Product,
    ProductAlias,
    MessageLog,
    Tenant,
    StockBalance,
    InventoryMovement,
    CustomerBalance,
    InboundEvent,
    BusinessMetricEvent,
)
from app.core.logging import logger


class ParsingEngine:
    """
    Intelligence Core v3: Inventory-Centric Parser.
    Always bases resolution on the tenant's specific catalog (SKUs & Names).
    """

    def __init__(self, session: Session, tenant: Tenant):
        self.session = session
        self.tenant = tenant

    def _normalize(self, text: str) -> str:
        """Standardizes text for matching."""
        if not text:
            return ""
        text = text.lower().strip()
        # Remove accents
        text = "".join(
            c
            for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )
        return text

    def parse_order(self, raw_text: str) -> List[Dict]:
        """
        Parses order items based strictly on Tenant Inventory.
        Returns: [ { "sku": "CODE", "qty": 10, "product_name": "Friendly Name" } ]
        """
        text = self._normalize(raw_text)
        results = []

        # 1. FETCH TENANT INVENTORY (Source of Truth)
        products = self.session.exec(
            select(Product).where(Product.tenant_id == self.tenant.id)
        ).all()

        # Pre-process inventory for matching
        # Matrix: key (normalized) -> SKU
        inventory_matches = {}
        names_map = {}
        for p in products:
            sku_norm = self._normalize(p.sku)
            name_norm = self._normalize(p.name)
            inventory_matches[sku_norm] = p.sku
            inventory_matches[name_norm] = p.sku
            names_map[p.sku] = p.name

        # 2. FETCH ALIASES (Secondary resolution)
        aliases = self.session.exec(
            select(ProductAlias).where(ProductAlias.tenant_id == self.tenant.id)
        ).all()
        alias_map = {self._normalize(a.alias): a.product_id for a in aliases}

        # 3. EXTRACTION LOOP
        # Simple extraction pattern: [Quantity] [Text]
        # Regex handles numbers followed by words/complex SKUs
        pattern = r"(\d+)\s+([a-z0-9\-\. ]{2,})"
        matches = re.finditer(pattern, text)

        for match in matches:
            qty = int(match.group(1))
            raw_ref = match.group(2).strip()

            sku_found = None

            # --- Resolution Priority ---

            # A. Full Match (SKU or Name)
            if raw_ref in inventory_matches:
                sku_found = inventory_matches[raw_ref]

            # B. Partial Match (Is the raw_ref contained in any catalog name?)
            if not sku_found:
                for norm_name, sku in inventory_matches.items():
                    if raw_ref in norm_name or norm_name in raw_ref:
                        sku_found = sku
                        break

            # C. Alias Resolution
            if not sku_found and raw_ref in alias_map:
                p_id = alias_map[raw_ref]
                p_obj = self.session.get(Product, p_id)
                if p_obj:
                    sku_found = p_obj.sku

            # D. Fuzzy Matching (Catch typos like 'cokie n crem' or 'doble choco')
            if not sku_found:
                import difflib

                all_valid_words = list(inventory_matches.keys()) + list(
                    alias_map.keys()
                )
                closest = difflib.get_close_matches(
                    raw_ref, all_valid_words, n=1, cutoff=0.65
                )
                if closest:
                    best_match = closest[0]
                    if best_match in inventory_matches:
                        sku_found = inventory_matches[best_match]
                    elif best_match in alias_map:
                        p_id = alias_map[best_match]
                        p_obj = self.session.get(Product, p_id)
                        if p_obj:
                            sku_found = p_obj.sku

            if sku_found:
                results.append(
                    {
                        "sku": sku_found,
                        "qty": qty,
                        "product_name": names_map.get(sku_found, "Unknown"),
                    }
                )

        return results

    def execute_order(
        self, customer: Customer, items: List[Dict]
    ) -> Tuple[float, float, List[str]]:
        """Executes inventory delivery to customer via the canonical inventory service."""
        from app.services.inventory_service import execute_delivery

        total_delivery_charge = 0.0
        product_summary = []

        for item in items:
            sku = item["sku"]
            qty = item["qty"]

            product = self.session.exec(
                select(Product).where(
                    Product.tenant_id == self.tenant.id, Product.sku == sku
                )
            ).first()

            if not product:
                continue

            # WhatsApp default: menudeo tier (no tier resolution from message text)
            unit_price = product.price_menudeo or product.price or 0.0
            tier_applied = "menudeo"

            try:
                execute_delivery(
                    session=self.session,
                    tenant=self.tenant,
                    product=product,
                    customer=customer,
                    quantity=qty,
                    unit_price=unit_price,
                    tier_applied=tier_applied,
                    description="Entrega a consignación vía WhatsApp",
                )
            except ValueError as e:
                # Re-raise so the worker can log STOCK_INSUFFICIENT etc.
                raise

            total_delivery_charge += qty * unit_price
            product_summary.append(f"- {item['product_name']} x{qty}")

        # Emit Business Event: Order Processed
        self.session.add(
            BusinessMetricEvent(
                tenant_id=self.tenant.id,
                event_type="order_processed",
                amount=total_delivery_charge,
            )
        )

        # Get final balance for receipt
        final_balance = 0.0
        cb = self.session.exec(
            select(CustomerBalance).where(
                CustomerBalance.tenant_id == self.tenant.id,
                CustomerBalance.customer_id == customer.id,
            )
        ).first()
        if cb:
            final_balance = cb.balance

        return total_delivery_charge, final_balance, product_summary

    def extract_customer(self, text: str, sender_phone: str) -> Customer:
        """Finds the target customer through Aliases, Names, or Fragments."""
        from app.models.models import CustomerAlias

        normalized_text = self._normalize(text)
        customers = self.session.exec(
            select(Customer).where(Customer.tenant_id == self.tenant.id)
        ).all()
        aliases = self.session.exec(
            select(CustomerAlias).where(CustomerAlias.tenant_id == self.tenant.id)
        ).all()

        # 1. Higher Priority: Exact or Alias inclusion
        for a in aliases:
            if self._normalize(a.alias) in normalized_text:
                return self.session.get(Customer, a.customer_id)

        for c in customers:
            if self._normalize(c.name) in normalized_text:
                return c

        # 2. Extract fragment after "para"
        pattern = r"para\s+(?:el\s+|la\s+|los\s+|las\s+)?([a-z0-9\-\. ]+)"
        match = re.search(pattern, normalized_text)
        if match:
            fragment = match.group(1).strip()
            if len(fragment) > 2:  # Ignore very short fragments like "para m"
                # Search for fragment in names (case insensitive)
                for c in customers:
                    if fragment in self._normalize(c.name):
                        return c
                for a in aliases:
                    if fragment in self._normalize(a.alias):
                        return self.session.get(Customer, a.customer_id)

            extracted_name = fragment.upper()
        else:
            extracted_name = f"Cliente {sender_phone[-4:]}"

        # 3. Final check: Does this extracted name closely match existing name?
        # (Exact match of normalized names)
        for c in customers:
            if self._normalize(c.name) == self._normalize(extracted_name):
                return c

        # Create new customer only if no fragment/match found
        new_customer = Customer(
            tenant_id=self.tenant.id,
            name=extracted_name,
            phone_number=sender_phone if not match else None,
        )
        self.session.add(new_customer)
        self.session.flush()
        return new_customer

    def parse_payment(self, raw_text: str) -> Optional[Dict[str, Any]]:
        """
        Parses payment intents like 'Juan me pagó 200' or 'Abono 500 de Maria'
        """
        text = self._normalize(raw_text)

        # Pattern: [verb] [amount]
        # Verbs: pago, abono, recibi, liquide
        payment_pattern = r"(pago|abono|recibi|liquide|pague)\s+(\d+(?:\.\d+)?)"
        match = re.search(payment_pattern, text)

        if match:
            amount = float(match.group(2))
            return {"type": "payment", "amount": amount}

        return None

    def execute_payment(self, customer: Customer, amount: float) -> float:
        """Registers a customer payment via the canonical inventory service."""
        from app.services.inventory_service import execute_payment as svc_execute_payment

        svc_execute_payment(
            session=self.session,
            tenant=self.tenant,
            customer=customer,
            amount=amount,
            method="cash",  # Default for WhatsApp reported payments
        )

        # Emit Business Event: Payment Received
        self.session.add(
            BusinessMetricEvent(
                tenant_id=self.tenant.id,
                event_type="payment_received",
                amount=amount,
            )
        )

        # Return current balance for receipt
        final_balance = 0.0
        cust_balance = self.session.exec(
            select(CustomerBalance).where(
                CustomerBalance.tenant_id == self.tenant.id,
                CustomerBalance.customer_id == customer.id,
            )
        ).first()
        if cust_balance:
            final_balance = cust_balance.balance

        return final_balance

    def process_and_log(
        self, sender: str, raw_text: str
    ) -> Tuple[MessageLog, Optional[Dict[str, Any]]]:
        """Logs structured intent extraction and executes multi-tenant domain actions."""

        # 1. Intent Prioritization: Payment vs Order
        payment_data = self.parse_payment(raw_text)
        items = [] if payment_data else self.parse_order(raw_text)

        intent = "unknown"
        if payment_data:
            intent = "payment"
        elif items:
            intent = "delivery"

        log = MessageLog(
            tenant_id=self.tenant.id,
            sender=sender,
            raw_message=raw_text,
            detected_intent=intent,
            detected_entities=json.dumps(payment_data if payment_data else items),
            confidence=0.9 if intent != "unknown" else 0.1,
            needs_confirmation=intent == "unknown",
            final_status="pending",
        )
        self.session.add(log)

        receipt_data = None

        try:
            normalized_text = self._normalize(raw_text)
            customer = self.extract_customer(normalized_text, sender)

            if intent == "payment":
                amount = payment_data["amount"]
                new_balance = self.execute_payment(customer, amount)
                log.final_status = "processed"

                receipt_data = {
                    "customer_name": customer.name,
                    "type": "payment",
                    "amount_received": amount,
                    "balance": new_balance,
                    "to_number": sender,
                }

            elif intent == "delivery":
                total, balance, summary = self.execute_order(customer, items)
                log.final_status = "processed"

                receipt_data = {
                    "customer_name": customer.name,
                    "type": "delivery",
                    "product_list": "\n".join(summary),
                    "total_amount": total,
                    "balance": balance,
                    "to_number": sender,
                }

            else:
                log.final_status = "failed"  # Unknown intent

        except Exception as e:
            self.session.rollback()
            logger.error(
                "parser.execution_failed", error=str(e), tenant_id=str(self.tenant.id)
            )
            log.final_status = "failed"
            raise e

        self.session.commit()
        return log, receipt_data
