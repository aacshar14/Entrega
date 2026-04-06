import re
import json
import unicodedata
from typing import Optional, Dict, List
from uuid import UUID
from sqlmodel import Session, select
from datetime import datetime, timezone

from app.models.models import Customer, Product, ProductAlias, MessageLog, Tenant

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
        if not text: return ""
        text = text.lower().strip()
        # Remove accents
        text = ''.join(c for c in unicodedata.normalize('NFD', text)
                      if unicodedata.category(c) != 'Mn')
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
        pattern = r'(\d+)\s+([a-z0-9\-\. ]{2,})'
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

            if sku_found:
                results.append({
                    "sku": sku_found,
                    "qty": qty,
                    "product_name": names_map.get(sku_found, "Unknown")
                })

        return results

    def process_and_log(self, sender: str, raw_text: str) -> MessageLog:
        """Logs structured order extraction for observability."""
        items = self.parse_order(raw_text)
        
        log = MessageLog(
            tenant_id=self.tenant.id,
            sender=sender,
            raw_message=raw_text,
            detected_intent="order" if items else "unknown",
            detected_entities=json.dumps(items),
            confidence=0.9 if items else 0.1,
            needs_confirmation=not bool(items),
            final_status="pending"
        )
        self.session.add(log)
        self.session.commit()
        return log
