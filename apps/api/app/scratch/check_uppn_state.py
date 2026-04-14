
from sqlmodel import Session, select
from app.core.db import engine
from app.models.models import Customer, Product, CustomerBalance
import uuid

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

with Session(engine) as session:
    # Check UPPN
    uppn = session.exec(select(Customer).where(Customer.name.ilike("%UPPN%"), Customer.tenant_id == TENANT_ID)).first()
    if uppn:
        print(f"Customer: {uppn.name} | ID: {uppn.id} | Tier: {uppn.tier}")
        bal = session.exec(select(CustomerBalance).where(CustomerBalance.customer_id == uppn.id)).first()
        print(f"Current Balance: {bal.balance if bal else 'NO BALANCE RECORD'}")
    else:
        print("UPPN not found")

    # Check Product
    prod = session.exec(select(Product).where(Product.name.ilike("%doble chocolate%"), Product.tenant_id == TENANT_ID)).first()
    if prod:
        print(f"Product: {prod.name} | ID: {prod.id} | SKU: {prod.sku}")
        print(f"Price Mayoreo: {prod.price_mayoreo} | Menudeo: {prod.price_menudeo} | Base: {prod.price}")
    else:
        print("Product not found")
