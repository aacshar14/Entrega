from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4, UUID
from sqlmodel import SQLModel, Field, Relationship

def get_utc_now():
    return datetime.now(timezone.utc)

class Tenant(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class User(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id")
    email: str = Field(unique=True, index=True)
    full_name: str
    role: str = Field(default="operator") # owner, admin, operator
    is_active: bool = Field(default=True)
    auth_provider_ref: Optional[str] = Field(unique=True, index=True) # e.g., Supabase Auth ID
    phone_number: Optional[str] = Field(unique=True, index=True)
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)

class Customer(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id")
    name: str = Field(index=True)
    phone_number: str = Field(unique=True, index=True)
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class Product(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id")
    name: str = Field(index=True)
    sku: Optional[str] = Field(index=True)
    price: float = Field(default=0.0)
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class StockBalance(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id")
    product_id: UUID = Field(foreign_key="product.id")
    quantity: float = Field(default=0.0)
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    last_updated: datetime = Field(default_factory=get_utc_now)

class InventoryMovement(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id")
    product_id: UUID = Field(foreign_key="product.id")
    customer_id: Optional[UUID] = Field(default=None, foreign_key="customer.id")
    quantity: float # positive for stock additions, negative for deliveries
    type: str # 'delivery', 'restock', 'return', 'adjustment'
    description: Optional[str] = None
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class Payment(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id")
    customer_id: UUID = Field(foreign_key="customer.id")
    amount: float
    method: str # 'cash', 'transfer', 'card'
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class CustomerBalance(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id")
    customer_id: UUID = Field(foreign_key="customer.id")
    balance: float = Field(default=0.0) # negative if they owe money
    last_updated: datetime = Field(default_factory=get_utc_now)

class WhatsAppMessage(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: Optional[UUID] = Field(default=None, foreign_key="tenant.id")
    from_number: str = Field(index=True)
    message_sid: str = Field(unique=True, index=True) # Meta specific ID
    external_message_id: Optional[str] = Field(unique=True, index=True) # Idempotency key
    body: Optional[str] = None
    raw_payload: Optional[str] = Field(description="Raw JSON payload from Meta")
    message_type: str = Field(default="text") # text, audio, image
    intent: Optional[str] = None
    processed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=get_utc_now)

class OnboardingEvent(SQLModel, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenant.id")
    event_type: str # 'user_invitation', 'shop_setup', etc.
    metadata_json: Optional[str] = None
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=get_utc_now)
