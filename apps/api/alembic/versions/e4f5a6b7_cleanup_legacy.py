"""cleanup legacy tables

Revision ID: e4f5a6b7
Revises: 9c2345ef
Create Date: 2026-04-11 12:38:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "e4f5a6b7"
down_revision = "9c2345ef"
branch_labels = None
depends_on = None


def upgrade():
    # Drop legacy whatsapp_configs table which is superseded by tenant_whatsapp_integrations
    op.drop_table("whatsapp_configs")


def downgrade():
    # Recreate the legacy table if needed for rollback
    op.create_table(
        "whatsapp_configs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("waba_id", sa.String(), nullable=True),
        sa.Column("meta_phone_number_id", sa.String(), nullable=True),
        sa.Column("display_phone_number", sa.String(), nullable=True),
        sa.Column("whatsapp_business_account_name", sa.String(), nullable=True),
        sa.Column("encrypted_access_token", sa.String(), nullable=True),
        sa.Column("meta_token_expires_at", sa.DateTime(), nullable=True),
        sa.Column("meta_onboarding_status", sa.String(), nullable=False),
        sa.Column("setup_completed", sa.Boolean(), nullable=False),
        sa.Column("connected_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id"),
    )
    op.create_index("idx_whatsapp_configs_waba", "whatsapp_configs", ["waba_id"])
