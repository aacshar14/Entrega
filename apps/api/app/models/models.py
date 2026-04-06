from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4, UUID
from sqlmodel import SQLModel, Field, Relationship, UniqueConstraint
from pydantic import BaseModel

def get_utc_now():
    return datetime.now(timezone.utc)

# --- Database Tables (SQLModel) ---

class SystemSetting(SQLModel, table=True):
    """Global platform-wide configuration settings stored in Supabase"""
    __tablename__ = "system_settings"
    key: str = Field(primary_key=True)
    value: str
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=get_utc_now)

class Tenant(SQLModel, table=True):
    __tablename__ = "tenants"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    slug: str = Field(unique=True, index=True)
    name: str = Field(index=True)
    logo_url: Optional[str] = None
    
    # Status & Localization
    status: str = Field(default="active")
    timezone: str = Field(default="UTC")
    currency: str = Field(default="MXN")
    
    # Business Metadata
    business_name: Optional[str] = None
    business_whatsapp_number: Optional[str] = None
    
    # Onboarding Readiness Flags (State Machine)
    clients_imported: bool = Field(default=False)
    stock_imported: bool = Field(default=False)
    business_whatsapp_connected: bool = Field(default=False)
    ready: bool = Field(default=False) 
    
    # Meta WhatsApp Business Account (WABA) Info
    whatsapp_status: str = Field(default="disconnected") 
    whatsapp_app_id: Optional[str] = None
    whatsapp_connected_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class WhatsAppConfig(SQLModel, table=True):
    """Secure per-tenant WhatsApp Business Cloud API configuration"""
    __tablename__ = "whatsapp_configs"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", unique=True, index=True)
    
    # Meta Identifiers
    waba_id: Optional[str] = Field(default=None, index=True)
    meta_phone_number_id: Optional[str] = Field(default=None, index=True)
    display_phone_number: Optional[str] = None
    whatsapp_business_account_name: Optional[str] = None
    
    # Security & Lifecycle
    encrypted_access_token: Optional[str] = Field(default=None, description="AES-256 encrypted Meta Access Token")
    meta_token_expires_at: Optional[datetime] = None
    meta_onboarding_status: str = Field(default="pending", index=True) # 'pending', 'authorized', 'verified', 'failed'
    setup_completed: bool = Field(default=False)
    
    # Audit
    connected_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    platform_role: str = Field(default="user") # 'admin' (global), 'user' (limited to memberships)
    is_active: bool = Field(default=True)
    auth_provider_id: Optional[str] = Field(unique=True, index=True) # Supabase UUID
    created_at: datetime = Field(default_factory=get_utc_now)

class TenantUser(SQLModel, table=True):
    """Link table for Users and Tenants (Memberships)"""
    __tablename__ = "tenant_users"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    tenant_role: str = Field(default="operator") # 'owner', 'operator'
    is_default: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=get_utc_now)

class Customer(SQLModel, table=True):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "phone_number", name="uq_customer_tenant_phone"),
    )
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id")
    name: str = Field(index=True)
    phone_number: Optional[str] = Field(default=None, index=True)
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    tier: str = Field(default="menudeo") # 'mayoreo', 'menudeo', 'especial'
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class Product(SQLModel, table=True):
    __tablename__ = "products"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id")
    name: str = Field(index=True)
    sku: str = Field(index=True)
    price: float = Field(default=0.0) # Base/Legacy price
    price_mayoreo: float = Field(default=0.0)
    price_menudeo: float = Field(default=0.0)
    price_especial: float = Field(default=0.0)
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class StockBalance(SQLModel, table=True):
    __tablename__ = "stock_balances"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id")
    product_id: UUID = Field(foreign_key="products.id")
    quantity: float = Field(default=0.0)
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    last_updated: datetime = Field(default_factory=get_utc_now)

class InventoryMovement(SQLModel, table=True):
    __tablename__ = "inventory_movements"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id")
    product_id: UUID = Field(foreign_key="products.id")
    customer_id: Optional[UUID] = Field(default=None, foreign_key="customers.id")
    quantity: float # positive for stock additions, negative for deliveries
    type: str # 'delivery', 'restock', 'return', 'adjustment'
    description: Optional[str] = None
    
    # Financial Metadata (Snapshot at time of movement)
    sku: Optional[str] = None
    tier_applied: Optional[str] = None
    unit_price: float = Field(default=0.0)
    total_amount: float = Field(default=0.0)
    
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class Payment(SQLModel, table=True):
    __tablename__ = "payments"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id")
    customer_id: UUID = Field(foreign_key="customers.id")
    amount: float
    method: str # 'cash', 'transfer', 'card'
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class CustomerBalance(SQLModel, table=True):
    __tablename__ = "customer_balances"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id")
    customer_id: UUID = Field(foreign_key="customers.id")
    balance: float = Field(default=0.0) # negative if they owe money
    last_updated: datetime = Field(default_factory=get_utc_now)

class WhatsAppMessage(SQLModel, table=True):
    __tablename__ = "whatsapp_messages"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: Optional[UUID] = Field(default=None, foreign_key="tenants.id")
    from_number: str = Field(index=True)
    message_sid: str = Field(unique=True, index=True)
    external_message_id: Optional[str] = Field(unique=True, index=True)
    body: Optional[str] = None
    raw_payload: Optional[str] = None
    message_type: str = Field(default="text")
    created_at: datetime = Field(default_factory=get_utc_now)

class MessageLog(SQLModel, table=True):
    """Logging estructurado de mensajes para Review / Learning Mode"""
    __tablename__ = "message_logs"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    sender: str = Field(index=True)
    raw_message: str
    timestamp: datetime = Field(default_factory=get_utc_now)
    
    # Parsing Engine Output
    detected_intent: Optional[str] = None # 'delivery', 'payment', 'stock', 'unknown'
    detected_entities: Optional[str] = Field(default=None, description="JSON string: {customer, product, amount, qty}")
    confidence: float = Field(default=0.0)
    
    # Review & Status
    needs_confirmation: bool = Field(default=False)
    final_status: str = Field(default="pending") # 'pending', 'processed', 'corrected', 'failed'
    
    # Human Review
    corrected_intent: Optional[str] = None
    corrected_entities: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")

class CustomerAlias(SQLModel, table=True):
    """Aliases locales por tenant (Ej: 'Juan' -> Juan Lopez)"""
    __tablename__ = "customer_aliases"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    customer_id: UUID = Field(foreign_key="customers.id", index=True)
    alias: str = Field(index=True)
    created_at: datetime = Field(default_factory=get_utc_now)

class ProductAlias(SQLModel, table=True):
    """Aliases de productos locales por tenant (Ej: 'Choco' -> ChocoBites Bites)"""
    __tablename__ = "product_aliases"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    product_id: UUID = Field(foreign_key="products.id", index=True)
    alias: str = Field(index=True)
    created_at: datetime = Field(default_factory=get_utc_now)

class OnboardingEvent(SQLModel, table=True):
    __tablename__ = "onboarding_events"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id")
    event_type: str 
    metadata_json: Optional[str] = None
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now)

class InboundEvent(SQLModel, table=True):
    """
    EntréGA Inbound Event Queue (Postgres-backed).
    Used for safe asynchronous decoupling of heavy webhook logic.
    """
    __tablename__ = "inbound_events"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    
    # Context
    source: str = Field(default="whatsapp", index=True) # e.g., 'whatsapp', 'shopify'
    event_type: str = Field(default="message") # e.g., 'message', 'status_update'
    message_sid: str = Field(index=True) # Provider-level ID (e.g., Meta SID) for idempotency
    payload_json: str = Field(description="Raw JSON payload of the event")
    
    # State Machine
    status: str = Field(default="pending", index=True) # 'pending', 'processing', 'done', 'failed'
    attempt_count: int = Field(default=0)
    
    # Latency Metrics (Measured in ms)
    webhook_duration_ms: Optional[float] = Field(default=None, description="Time from request to enqueue (ms)")
    
    # Chronology & Locking
    available_at: datetime = Field(default_factory=get_utc_now, index=True)
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None # Worker hostname or ID
    
    created_at: datetime = Field(default_factory=get_utc_now)
    processed_at: Optional[datetime] = None
    last_error: Optional[str] = None

class MetricSnapshot(SQLModel, table=True):
    """
    Pre-aggregated metrics for the Platform Admin Dashboard (Rollups).
    Eliminates the cost of real-time p90/p95 calculation on raw events.
    """
    __tablename__ = "metric_snapshots"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: Optional[UUID] = Field(default=None, foreign_key="tenants.id", index=True)
    metric_name: str = Field(index=True) # 'latency_p95', 'backlog_size', 'error_rate'
    metric_value: float
    
    # Timing
    period_start: datetime
    period_end: datetime
    created_at: datetime = Field(default_factory=get_utc_now)

class AuditLog(SQLModel, table=True):
    """
    Platform-wide audit trail for administrative actions.
    """
    __tablename__ = "audit_logs"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    performed_by: UUID = Field(index=True) # User ID
    action: str = Field(index=True) # 'update_settings', 'suspend_user', etc.
    module: str = Field(index=True) # 'platform_admin', 'tenant_admin'
    
    data_before: Optional[str] = None # JSON string
    data_after: Optional[str] = None # JSON string
    
    created_at: datetime = Field(default_factory=get_utc_now, index=True)
    ip_address: Optional[str] = None

class PlatformAlert(SQLModel, table=True):
    """
    Autonomous operational alerts triggered by metric thresholds.
    """
    __tablename__ = "platform_alerts"
    
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    type: str = Field(index=True) # 'backlog', 'latency', 'tenant_pressure', 'failures'
    severity: str = Field(index=True) # 'warning', 'critical'
    tenant_id: Optional[UUID] = Field(default=None, index=True)
    
    message: str
    recommended_action: Optional[str] = None
    
    snapshot_reference: Optional[str] = None # Metric name that triggered it
    metric_value: float
    
    is_active: bool = Field(default=True, index=True)
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now, index=True)

# --- Response & DTO Schemas (Bottom to ensure all SQLModel classes are defined) ---

class TenantInfo(BaseModel):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    status: str = "active"
    onboarding_step: int = 1
    business_whatsapp_number: Optional[str] = None
    clients_imported: bool = False
    stock_imported: bool = False
    business_whatsapp_connected: bool = False
    ready: bool = False
    whatsapp_status: str = "disconnected"
    whatsapp_display_number: Optional[str] = None
    whatsapp_account_name: Optional[str] = None
    whatsapp_app_id: Optional[str] = None
    timezone: str = "UTC"
    currency: str = "MXN"

class MembershipInfo(BaseModel):
    tenant: TenantInfo
    role: str
    is_default: bool

class MeResponse(BaseModel):
    user: User
    active_tenant: Optional[TenantInfo] = None
    memberships: List[MembershipInfo] = []

class MessageCorrection(BaseModel):
    intent: str
    entities: dict
    status: str = "corrected"
