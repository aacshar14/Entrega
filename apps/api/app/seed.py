from uuid import uuid4
from sqlmodel import Session, create_engine, select
from app.core.config import settings
from app.models.models import Tenant, User, Customer, Product, StockBalance, CustomerBalance

# Use the environment database URL
engine = create_engine(settings.DATABASE_URL)

def seed_data():
    with Session(engine) as session:
        # 1. Check if Tenant already exists
        statement = select(Tenant).where(Tenant.slug == "chocobites")
        tenant = session.exec(statement).first()
        
        if not tenant:
            print("🌱 Seeding Tenant: ChocoBites...")
            tenant = Tenant(
                name="ChocoBites Pilot",
                slug="chocobites"
            )
            session.add(tenant)
            session.commit()
            session.refresh(tenant)
        else:
            print("✅ Tenant ChocoBites already exists.")

        # 2. Seed Admin User
        user_stmt = select(User).where(User.email == "admin@chocobites.com")
        user = session.exec(user_stmt).first()
        if not user:
            print("🌱 Seeding User: Admin ChocoBites...")
            user = User(
                tenant_id=tenant.id,
                email="admin@chocobites.com",
                full_name="Admin ChocoBites",
                is_active=True
            )
            session.add(user)

        # 3. Seed Pseudo-Customer: Tulos
        # We use a dummy phone for WhatsApp simulation
        customer_stmt = select(Customer).where(Customer.phone_number == "+5211234567890")
        customer = session.exec(customer_stmt).first()
        if not customer:
            print("🌱 Seeding Customer: Tulos...")
            customer = Customer(
                tenant_id=tenant.id,
                name="Tulos",
                phone_number="+5211234567890",
                address="Calle Central 123"
            )
            session.add(customer)
            session.commit()
            session.refresh(customer)
            
            # Initial balance
            balance = CustomerBalance(
                tenant_id=tenant.id,
                customer_id=customer.id,
                balance=0.0
            )
            session.add(balance)
        else:
            print("✅ Customer Tulos already exists.")

        # 4. Seed Product: Chocolate Amargo
        product_stmt = select(Product).where(Product.name == "Chocolate Amargo 70%")
        product = session.exec(product_stmt).first()
        if not product:
            print("🌱 Seeding Product: Chocolate Amargo 70%...")
            product = Product(
                tenant_id=tenant.id,
                name="Chocolate Amargo 70%",
                sku="CH-AM-001",
                price=150.0
            )
            session.add(product)
            session.commit()
            session.refresh(product)
            
            # Initial stock
            stock = StockBalance(
                tenant_id=tenant.id,
                product_id=product.id,
                quantity=100.0
            )
            session.add(stock)
        else:
            print("✅ Product Chocolate Amargo already exists.")

        session.commit()
        print("🚀 Seed finished successfully! Ready for pilot testing.")

if __name__ == "__main__":
    seed_data()
