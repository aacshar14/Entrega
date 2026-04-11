"""Performance Hardening: Dashboard Snapshots & Indices
Revision ID: 9c2345ef
Revises: f8b1234b
Create Date: 2026-04-11 12:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic
revision = "9c2345ef"
down_revision = "f8b1234b"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Dashboard Query Optimization Indices
    # Optimized for: WHERE tenant_id = x AND type = 'delivery' AND created_at > y
    op.create_index(
        "idx_inventory_movements_tenant_type_created",
        "inventory_movements",
        ["tenant_id", "type", "created_at"],
    )

    # Optimized for: WHERE tenant_id = x AND created_at > y (Payments Today)
    op.create_index(
        "idx_payments_tenant_created", "payments", ["tenant_id", "created_at"]
    )

    # Optimized for: WHERE tenant_id = x AND quantity <= 10 (Low Stock)
    op.create_index(
        "idx_stock_balances_tenant_quantity",
        "stock_balances",
        ["tenant_id", "quantity"],
    )

    # Optimized for: WHERE tenant_id = x AND balance < 0 (Debtors)
    op.create_index(
        "idx_customer_balances_tenant_balance",
        "customer_balances",
        ["tenant_id", "balance"],
    )

    # 2. MetricSnapshot Uniqueness for Idempotent Snapshots
    # Prevents duplicate rollup rows for the same window
    op.create_unique_constraint(
        "uq_metric_snapshot_tenant_name_period",
        "metric_snapshots",
        ["tenant_id", "metric_name", "period_start"],
    )


def downgrade():
    op.drop_constraint(
        "uq_metric_snapshot_tenant_name_period", table_name="metric_snapshots"
    )
    op.drop_index(
        "idx_customer_balances_tenant_balance", table_name="customer_balances"
    )
    op.drop_index("idx_stock_balances_tenant_quantity", table_name="stock_balances")
    op.drop_index("idx_payments_tenant_created", table_name="payments")
    op.drop_index(
        "idx_inventory_movements_tenant_type_created", table_name="inventory_movements"
    )
