"""v1_6_6_final_rls_hardening_exhaustive

Revision ID: 648926728a34
Revises: 90c0bc5de185
Create Date: 2026-04-10 16:57:39.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "648926728a34"
down_revision = "90c0bc5de185"
branch_labels = None
depends_on = None

# Exhaustive list of business and system tables to harden in the public schema
# This list is prioritized for multi-tenant isolation and platform security.
TABLES = [
    "alembic_version",
    "audit_logs",
    "business_metric_events",
    "customer_aliases",
    "customer_balances",
    "customers",
    "inbound_events",
    "inventory_movements",
    "message_logs",
    "metric_snapshots",
    "notifications",
    "onboarding_events",
    "payments",
    "platform_alerts",
    "processed_messages",
    "product_aliases",
    "products",
    "stock_balances",
    "system_settings",
    "tenant_users",
    "tenant_whatsapp_integrations",
    "tenants",
    "users",
    "whatsapp_configs",
    "whatsapp_messages",
]


def upgrade() -> None:
    """
    Enforces Row Level Security (RLS) on all named tables.
    Backend operations (FastAPI) use a privileged connection that bypasses RLS.
    PostgREST (Supabase Client Access) is blocked as no permissive policies are added.
    """
    for table in TABLES:
        # Use IF EXISTS check via SQL to ensure idempotency and safety
        op.execute(f"ALTER TABLE IF EXISTS public.{table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE IF EXISTS public.{table} FORCE ROW LEVEL SECURITY;")


def downgrade() -> None:
    """
    Reverts RLS hardening on the specified tables.
    """
    for table in TABLES:
        op.execute(f"ALTER TABLE IF EXISTS public.{table} DISABLE ROW LEVEL SECURITY;")
