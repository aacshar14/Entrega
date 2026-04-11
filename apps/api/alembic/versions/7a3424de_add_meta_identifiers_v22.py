"""v1_7_hardened_whatsapp_identifiers

Revision ID: 7a3424de
Revises: 412f47b2c7aa
Create Date: 2026-04-11 15:40:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = "7a3424de"
down_revision: Union[str, None] = "412f47b2c7aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add Level 2 Meta Infrastructure Columns
    op.add_column(
        "tenant_whatsapp_integrations",
        sa.Column("meta_app_id", sa.String(), nullable=True),
    )
    op.add_column(
        "tenant_whatsapp_integrations",
        sa.Column("configuration_id", sa.String(), nullable=True),
    )
    op.add_column(
        "tenant_whatsapp_integrations",
        sa.Column("business_account_id", sa.String(), nullable=True),
    )
    op.add_column(
        "tenant_whatsapp_integrations",
        sa.Column(
            "onboarding_status", sa.String(), server_default="pending", nullable=False
        ),
    )

    # 2. Level 2 Hardening: Webhook Uniqueness Guard
    # Resolve any duplicates before enforcing unique (though unlikely in current state)
    op.create_unique_constraint(
        "uq_whatsapp_phone_number_id",
        "tenant_whatsapp_integrations",
        ["phone_number_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_whatsapp_phone_number_id", "tenant_whatsapp_integrations", type_="unique"
    )
    op.drop_column("tenant_whatsapp_integrations", "onboarding_status")
    op.drop_column("tenant_whatsapp_integrations", "business_account_id")
    op.drop_column("tenant_whatsapp_integrations", "configuration_id")
    op.drop_column("tenant_whatsapp_integrations", "meta_app_id")
