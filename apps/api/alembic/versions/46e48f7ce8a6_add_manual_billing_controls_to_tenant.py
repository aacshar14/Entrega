"""add_manual_billing_controls_to_tenant

Revision ID: 46e48f7ce8a6
Revises: 909b7521037d
Create Date: 2026-04-10 09:06:18.262620

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # added


# revision identifiers, used by Alembic.
revision: str = "46e48f7ce8a6"
down_revision: Union[str, None] = "909b7521037d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add billing columns
    op.add_column("tenants", sa.Column("billing_status", sa.String(), nullable=True))
    op.add_column("tenants", sa.Column("trial_ends_at", sa.DateTime(), nullable=True))
    op.add_column("tenants", sa.Column("grace_ends_at", sa.DateTime(), nullable=True))
    op.add_column("tenants", sa.Column("subscription_ends_at", sa.DateTime(), nullable=True))
    op.add_column("tenants", sa.Column("billing_notes", sa.String(), nullable=True))
    op.add_column("tenants", sa.Column("billing_updated_by", sa.UUID(), nullable=True))
    op.add_column("tenants", sa.Column("billing_updated_at", sa.DateTime(), nullable=True))

    # Initialize existing tenants: Grace period of 7 days
    # Note: We use raw SQL to avoid dependency on SQLModel during migration
    op.execute("UPDATE tenants SET billing_status = 'grace'")
    op.execute("UPDATE tenants SET grace_ends_at = NOW() + INTERVAL '7 days'")


def downgrade() -> None:
    op.drop_column("tenants", "billing_updated_at")
    op.drop_column("tenants", "billing_updated_by")
    op.drop_column("tenants", "billing_notes")
    op.drop_column("tenants", "subscription_ends_at")
    op.drop_column("tenants", "grace_ends_at")
    op.drop_column("tenants", "trial_ends_at")
    op.drop_column("tenants", "billing_status")
