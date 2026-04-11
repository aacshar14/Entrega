from sqlmodel import Session, select
from app.models.models import Tenant, Product, Customer, InventoryMovement, StockBalance
from uuid import UUID
from datetime import datetime, timezone
from app.core.logging import logger


class DemoService:
    def __init__(self, db: Session):
        self.db = db

    def seed_aguachiles_demo(self, tenant_id: UUID):
        """
        Seeds the 'Aguachiles Demo' data for a specific tenant.
        Idempotent: Checks if data already exists before creating.
        """
        logger.info("demo.seeding_started", tenant_id=str(tenant_id))

        # 1. Products
        products_data = [
            {"sku": "AG-CAM", "name": "Aguachile Camaron", "price": 200},
            {"sku": "AG-PUL", "name": "Aguachile Pulpo", "price": 250},
            {"sku": "AG-MIX", "name": "Aguachile Mixto", "price": 300},
        ]

        sku_map = {}
        for p in products_data:
            existing = self.db.exec(
                select(Product).where(
                    Product.tenant_id == tenant_id, Product.sku == p["sku"]
                )
            ).first()
            if not existing:
                product = Product(
                    tenant_id=tenant_id,
                    sku=p["sku"],
                    name=p["name"],
                    price=p["price"],
                    price_menudeo=p["price"],
                    price_mayoreo=p["price"] * 0.9,
                    status="active",
                )
                self.db.add(product)
                self.db.flush()
                sku_map[p["sku"]] = product
            else:
                # Force update prices
                existing.price = p["price"]
                existing.price_menudeo = p["price"]
                existing.price_mayoreo = p["price"] * 0.9
                self.db.add(existing)
                sku_map[p["sku"]] = existing

        # 2. Customers
        customers_data = [
            {"name": "Hugo Gonzalez", "phone": "8787021203"},
            {"name": "Renata Pina", "phone": "8781533325"},
        ]

        for c in customers_data:
            existing = self.db.exec(
                select(Customer).where(
                    Customer.tenant_id == tenant_id, Customer.phone_number == c["phone"]
                )
            ).first()
            if not existing:
                customer = Customer(
                    tenant_id=tenant_id,
                    name=c["name"],
                    phone_number=c["phone"],
                )
                self.db.add(customer)

        # 3. Stock Initialization
        stock_data = {
            "AG-CAM": 20,
            "AG-PUL": 15,
            "AG-MIX": 10,
        }

        for sku, qty in stock_data.items():
            product = sku_map.get(sku)
            if not product:
                continue

            # Check if stock already initialized
            existing_stock = self.db.exec(
                select(StockBalance).where(
                    StockBalance.tenant_id == tenant_id,
                    StockBalance.product_id == product.id,
                )
            ).first()

            if not existing_stock or existing_stock.quantity == 0:
                # Create initial restock movement
                movement = InventoryMovement(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    type="restock",
                    quantity=qty,
                    description="Carga inicial Demo",
                )
                self.db.add(movement)

                # Update or Create StockBalance
                if existing_stock:
                    existing_stock.quantity = qty
                    existing_stock.last_updated = datetime.now(timezone.utc)
                else:
                    new_stock = StockBalance(
                        tenant_id=tenant_id,
                        product_id=product.id,
                        quantity=qty,
                        last_updated=datetime.now(timezone.utc),
                    )
                    self.db.add(new_stock)

        self.db.commit()
        logger.info("demo.seeding_completed", tenant_id=str(tenant_id))
        return True
