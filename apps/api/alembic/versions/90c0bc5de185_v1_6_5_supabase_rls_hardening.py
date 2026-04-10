"""v1_6_5_supabase_rls_hardening

Revision ID: 90c0bc5de185
Revises: 9b8dd3cfcbf6
Create Date: 2026-04-10 16:35:51.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "90c0bc5de185"
down_revision = "9b8dd3cfcbf6"
branch_labels = None
depends_on = None

TABLES = [
    "system_settings",
    "tenants",
    "whatsapp_configs",
    "tenant_whatsapp_integrations",
    "users",
    "tenant_users",
    "customers",
    "products",
    "stock_balances",
    "inventory_movements",
    "payments",
    "customer_balances",
    "whatsapp_messages",
    "message_logs",
    "customer_aliases",
    "product_aliases",
    "onboarding_events",
    "inbound_events",
    "metric_snapshots",
    "audit_logs",
    "platform_alerts",
    "processed_messages",
    "business_metric_events",
    "notifications",
]


def upgrade() -> None:
    """
    Hardens the public schema by enabling Row Level Security (RLS) on all sensitive tables.
    Since EntréGA uses a privileged database connection (postgres/service_role),
    backend operations remain unaffected.
    However, this blocks all access via Supabase PostgREST (anon/authenticated)
    as no permissive policies are defined.
    """
    for table in TABLES:
        # Use IF EXISTS check via SQL to avoid migration failure if table was dropped/renamed
        op.execute(f"ALTER TABLE IF EXISTS public.{table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE IF EXISTS public.{table} FORCE ROW LEVEL SECURITY;")


def downgrade() -> None:
    """
    Disables RLS on the hardened tables.
    """
    for table in TABLES:
        op.execute(f"ALTER TABLE IF EXISTS public.{table} DISABLE ROW LEVEL SECURITY;")
