from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4, UUID
from sqlmodel import SQLModel, Field, Relationship, UniqueConstraint, Index, Column, String
from pydantic import BaseModel, validator
from enum import Enum
from sqlalchemy import Enum as SAEnum


def get_utc_now():
    return datetime.now(timezone.utc)


# --- Enumerations for Deterministic Logic ---

class MovementType(str, Enum):
    DELIVERY = "delivery"
    RESTOCK = "restock"
    RETURN = "return"
    ADJUSTMENT = "adjustment"
    PRODUCTION = "production"
    SALE_REPORTED = "sale_reported"
    DELIVERY_TO_CUSTOMER = "delivery_to_customer"
    RETURN_FROM_CUSTOMER = "return_from_customer"

class WhatsAppMessageStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"
    IGNORED = "ignored"

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

    # Onboarding Readiness (Explicit V2.3.0 State)
    onboarding_state: str = Field(default="created", index=True)
    onboarding_step: int = Field(default=1)

    # Onboarding Readiness Flags (State Machine Legacy - Keeping for compat)
    clients_imported: bool = Field(default=False)
    stock_imported: bool = Field(default=False)
    business_whatsapp_connected: bool = Field(default=False)
    ready: bool = Field(default=False)

    # Meta WhatsApp Business Account (WABA) Info
    whatsapp_status: str = Field(default="disconnected")
    whatsapp_app_id: Optional[str] = None
    whatsapp_connected_at: Optional[datetime] = None

    # --- Billing & Plan Control ---
    billing_status: str = Field(
        default="inactive", index=True
    )  # trial_active, active, grace, past_due, canceled, inactive
    plan_code: str = Field(default="basic_monthly", index=True)
    stripe_customer_id: Optional[str] = Field(default=None, index=True)
    stripe_subscription_id: Optional[str] = Field(default=None, index=True)
    stripe_price_id: Optional[str] = None
    subscription_ends_at: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None
    grace_ends_at: Optional[datetime] = None

    last_payment_status: Optional[str] = None
    last_stripe_event_id: Optional[str] = None

    billing_notes: Optional[str] = None
    billing_updated_by: Optional[UUID] = None
    billing_updated_at: Optional[datetime] = None

    # Global Enforcement (V2.5.0)
    is_blocked: bool = Field(default=False, index=True)
    block_reason: Optional[str] = None
    manually_overridden_by: Optional[UUID] = None
    manually_overridden_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)


class TenantWhatsAppIntegration(SQLModel, table=True):
    """Refined multi-tenant WhatsApp integration tracking for Embedded Signup"""

    __tablename__ = "tenant_whatsapp_integrations"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    provider: str = Field(default="meta")
    business_name: Optional[str] = None
    waba_id: Optional[str] = Field(default=None, index=True)
    phone_number_id: Optional[str] = Field(default=None, index=True, unique=True)
    access_token_encrypted: Optional[str] = None
    token_expires_at: Optional[datetime] = None

    # Metadata & Display
    display_phone_number: Optional[str] = None
    setup_completed: bool = Field(default=False)

    status: str = Field(
        default="pending"
    )  # 'connected', 'disconnected', 'token_expired', 'reconnect_required', 'pending'
    onboarding_status: str = Field(
        default="pending"
    )  # 'pending', 'connected', 'failed'

    # Meta Infrastructure Resolution
    meta_app_id: Optional[str] = Field(default=None)
    configuration_id: Optional[str] = Field(default=None)
    business_account_id: Optional[str] = Field(default=None)

    # Metadata and Lifecycle
    connected_at: Optional[datetime] = Field(default=None)
    last_validated_at: Optional[datetime] = None
    disconnected_at: Optional[datetime] = None
    metadata_json: Optional[str] = Field(default=None)

    # Phase 2 Observability: Onboarding Diagnostics
    last_error_code: Optional[str] = Field(default=None, index=True)
    last_error_message: Optional[str] = Field(default=None)
    last_attempt_at: Optional[datetime] = Field(default=None)

    onboarding_nonce: Optional[str] = None
    onboarding_nonce_expires_at: Optional[datetime] = None

    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=get_utc_now)


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    platform_role: str = Field(
        default="user"
    )  # 'admin' (global), 'user' (limited to memberships)
    is_active: Optional[bool] = Field(default=True)
    auth_provider_id: Optional[str] = Field(unique=True, index=True)  # Supabase UUID
    created_at: datetime = Field(default_factory=get_utc_now)


class TenantUser(SQLModel, table=True):
    """Link table for Users and Tenants (Memberships)"""

    __tablename__ = "tenant_users"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    tenant_role: str = Field(default="operator")  # 'owner', 'operator'
    is_default: Optional[bool] = Field(default=False)
    is_active: Optional[bool] = Field(default=True)
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
    tier: str = Field(default="menudeo")  # 'mayoreo', 'menudeo', 'especial'
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
    price: float = Field(default=0.0)  # Base/Legacy price
    price_mayoreo: float = Field(default=0.0)
    price_menudeo: float = Field(default=0.0)
    price_especial: float = Field(default=0.0)
    cost: float = Field(default=0.0)
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
    product_id: Optional[UUID] = Field(default=None, foreign_key="products.id")
    customer_id: Optional[UUID] = Field(default=None, foreign_key="customers.id")
    quantity: float  # positive for stock additions, negative for deliveries
    type: MovementType = Field(sa_column=Column(SAEnum(MovementType, values_callable=lambda obj: [e.value for e in obj]), default="delivery", index=True))
    description: Optional[str] = None

    @validator("type", pre=True)
    def validate_movement_type(cls, v):
        if isinstance(v, str):
            try:
                return MovementType(v.lower())
            except ValueError:
                raise ValueError(f"Invalid MovementType: {v}")
        return v

    class Config:
        validate_assignment = True
        validate_default = True
    customer_name_snapshot: Optional[str] = None

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
    method: str  # 'cash', 'transfer', 'card'
    created_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)


class CustomerBalance(SQLModel, table=True):
    __tablename__ = "customer_balances"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id")
    customer_id: UUID = Field(foreign_key="customers.id")
    balance: float = Field(default=0.0)  # negative if they owe money
    last_updated: datetime = Field(default_factory=get_utc_now)


class WhatsAppMessage(SQLModel, table=True):
    __tablename__ = "whatsapp_messages"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: Optional[UUID] = Field(
        default=None, foreign_key="tenants.id", index=True
    )

    # Meta Resolution (Routing)
    phone_number_id: Optional[str] = Field(default=None, index=True)
    sender_wa_id: Optional[str] = Field(default=None, index=True)  # The from_number

    # Provider Identifiers
    message_sid: str = Field(unique=True, index=True)
    external_message_id: Optional[str] = Field(unique=True, index=True)

    # Content
    body: Optional[str] = None
    raw_payload: Optional[str] = None
    message_type: str = Field(default="text")

    # State Machine (V2 Audit)
    processing_status: WhatsAppMessageStatus = Field(sa_column=Column(SAEnum(WhatsAppMessageStatus, values_callable=lambda obj: [e.value for e in obj]), default="pending", index=True))

    @validator("processing_status", pre=True)
    def validate_status(cls, v):
        if isinstance(v, str):
            try:
                return WhatsAppMessageStatus(v.lower())
            except ValueError:
                raise ValueError(f"Invalid WhatsAppMessageStatus: {v}")
        return v

    class Config:
        validate_assignment = True
        validate_default = True

    last_error_code: Optional[str] = Field(
        default=None, index=True
    )  # Normalized error code (e.g., 'PARSE_FAILED')
    last_error: Optional[str] = None

    processed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)

    @property
    def is_processed(self) -> bool:
        return self.processing_status == WhatsAppMessageStatus.PROCESSED


class MessageLog(SQLModel, table=True):
    """Logging estructurado de mensajes para Review / Learning Mode"""

    __tablename__ = "message_logs"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    sender: str = Field(index=True)
    raw_message: str
    timestamp: datetime = Field(default_factory=get_utc_now)

    # Parsing Engine Output
    detected_intent: Optional[str] = None  # 'delivery', 'payment', 'stock', 'unknown'
    detected_entities: Optional[str] = Field(
        default=None, description="JSON string: {customer, product, amount, qty}"
    )
    confidence: float = Field(default=0.0)

    # Review & Status
    needs_confirmation: bool = Field(default=False)
    final_status: str = Field(
        default="pending"
    )  # 'pending', 'processed', 'corrected', 'failed'

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
    source: str = Field(default="whatsapp", index=True)  # e.g., 'whatsapp', 'shopify'
    event_type: str = Field(default="message")  # e.g., 'message', 'status_update'
    message_sid: str = Field(
        index=True
    )  # Provider-level ID (e.g., Meta SID) for idempotency
    payload_json: str = Field(description="Raw JSON payload of the event")

    # State Machine
    status: str = Field(
        default="pending", index=True
    )  # 'pending', 'processing', 'done', 'failed'
    attempt_count: int = Field(default=0)

    # Latency Metrics (Measured in ms)
    webhook_duration_ms: Optional[float] = Field(
        default=None, description="Time from request to enqueue (ms)"
    )

    # Chronology & Locking
    available_at: datetime = Field(default_factory=get_utc_now, index=True)
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None  # Worker hostname or ID

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
    tenant_id: Optional[UUID] = Field(
        default=None, foreign_key="tenants.id", index=True
    )
    metric_name: str = Field(index=True)  # 'latency_p95', 'backlog_size', 'error_rate'
    metric_value: float

    # Timing
    period_start: datetime = Field(index=True)
    period_end: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=get_utc_now)

    # Phase 5 Resilience: Drift Control
    last_reconciled_at: Optional[datetime] = None
    update_counter: int = Field(default=0)  # Track number of mutations
    last_error_code: Optional[str] = None  # Persistent failure tracking

    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "metric_name", "period_start", name="uq_metric_snapshot"
        ),
    )


class MetricReconciliation(SQLModel, table=True):
    """
    Audit log for metric consistency.
    Tracks drift between snapshots and operational source-of-truth.
    """

    __tablename__ = "metric_reconciliations"

    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    metric_date: datetime = Field(index=True)

    # Results (Structured JSON strings)
    snapshot_values: str  # e.g. {"deliveries": 10}
    truth_values: str  # e.g. {"deliveries": 12}

    drift_detected: bool = Field(default=False, index=True)
    drift_summary: Optional[str] = None  # e.g. 'COUNT_MISMATCH'

    reconciled_at: datetime = Field(default_factory=get_utc_now)
    created_at: datetime = Field(default_factory=get_utc_now)


class AuditLog(SQLModel, table=True):
    """
    Platform-wide audit trail for administrative actions.
    """

    __tablename__ = "audit_logs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    performed_by: UUID = Field(index=True)  # User ID
    action: str = Field(index=True)  # 'update_settings', 'suspend_user', etc.
    module: str = Field(index=True)  # 'platform_admin', 'tenant_admin'

    data_before: Optional[str] = None  # JSON string
    data_after: Optional[str] = None  # JSON string

    created_at: datetime = Field(default_factory=get_utc_now, index=True)
    ip_address: Optional[str] = None


class StripeEvent(SQLModel, table=True):
    """
    Idempotency store for Stripe webhooks.
    Ensures 'Exactly-Once' processing for critical billing transitions.
    """

    __tablename__ = "stripe_events"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    stripe_event_id: str = Field(unique=True, index=True)
    tenant_id: Optional[UUID] = Field(
        default=None, foreign_key="tenants.id", index=True
    )
    event_type: str = Field(index=True)
    processed_at: datetime = Field(default_factory=get_utc_now)
    payload: Optional[str] = None  # Snippet or raw event


class PlatformAlert(SQLModel, table=True):
    """
    Autonomous operational alerts triggered by metric thresholds.
    """

    __tablename__ = "platform_alerts"

    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    type: str = Field(index=True)  # 'backlog', 'latency', 'tenant_pressure', 'failures'
    severity: str = Field(index=True)  # 'warning', 'critical'
    tenant_id: Optional[UUID] = Field(default=None, index=True)

    message: str
    recommended_action: Optional[str] = None

    snapshot_reference: Optional[str] = None  # Metric name that triggered it
    metric_value: float

    is_active: bool = Field(default=True, index=True)
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now, index=True)


# --- Response & DTO Schemas (V2.5.0 Hardened) ---


class BillingEntitlements(BaseModel):
    can_access_dashboard: bool = True
    can_process_whatsapp: bool = True
    can_create_orders: bool = True
    can_export: bool = True
    show_paywall: bool = False


class BillingInfo(BaseModel):
    billing_status: str
    effective_status: str  # trial_active, trial_expired, active_paid, grace, suspended
    plan_code: str
    trial_ends_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
    grace_ends_at: Optional[datetime] = None
    is_blocked: bool = False
    block_reason: Optional[str] = None
    entitlements: BillingEntitlements
    days_remaining: Optional[int] = None


# --- Response & DTO Schemas (Bottom to ensure all SQLModel classes are defined) ---


class TenantInfo(BaseModel):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None
    status: str = "active"
    onboarding_state: str = "created"
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

    # Unified Billing Context (V2.5.0)
    billing: Optional[BillingInfo] = None


class MembershipInfo(BaseModel):
    tenant: TenantInfo
    role: str
    is_default: Optional[bool] = False


class MeResponse(BaseModel):
    user: User
    active_tenant: Optional[TenantInfo] = None
    memberships: List[MembershipInfo] = []


class MessageCorrection(BaseModel):
    intent: str
    entities: dict
    status: str = "corrected"


# --- 🔁 Idempotency & Message Control (V1.2) ---


class ProcessedMessage(SQLModel, table=True):
    """
    Dedicated identity lock for multi-tenant idempotency.
    Guarantees 'Exactly-Once' processing for WhatsApp messages.
    """

    __tablename__ = "processed_messages"
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)
    message_id: str = Field(index=True)

    # State Machine: 'processing', 'processed', 'failed'
    status: str = Field(default="processing", index=True)

    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

    __table_args__ = (
        UniqueConstraint("tenant_id", "message_id", name="uq_tenant_message_id"),
        # Operational index for cleanup and recovery tasks
        Index("idx_processed_messages_status_updated", "status", "updated_at"),
    )


# --- 📊 Business Telemetry (V1.2 Final) ---


class BusinessMetricEvent(SQLModel, table=True):
    """
    Persistent event log for tenant metrics at scale.
    Backs the business dashboard without relaying on logs.
    """

    __tablename__ = "business_metric_events"

    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: UUID = Field(foreign_key="tenants.id", index=True)

    # Event Types: 'order_processed', 'stock_insufficient', 'processing_failed', 'sale_tracked'
    event_type: str = Field(index=True)

    # Optional payload for aggregation (e.g. amount for sales)
    amount: Optional[float] = Field(default=None)
    metadata_json: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=get_utc_now, index=True)


class Notification(SQLModel, table=True):
    """
    Intelligent notification system for Tenants and Platform Admins.
    Focuses on actionable signals, not logs.
    """

    __tablename__ = "notifications"

    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    tenant_id: Optional[UUID] = Field(
        default=None, foreign_key="tenants.id", index=True
    )  # NULL = Platform Admin

    # Categories per V1.6.4 specs:
    # Tenant: sales, action_required, operations, optimization
    # Platform: sales_opp, churn_risk, errors, growth
    category: str = Field(index=True)
    priority: str = Field(default="medium", index=True)  # low, medium, high, critical

    title: str
    message: str

    # Direct Actionability
    cta_label: Optional[str] = None
    cta_link: Optional[str] = None

    is_read: bool = Field(default=False, index=True)
    metadata_json: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=get_utc_now, index=True)
    expires_at: Optional[datetime] = None
