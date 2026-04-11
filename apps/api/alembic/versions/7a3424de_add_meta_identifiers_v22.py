"""v1_7_hardened_whatsapp_v22

Revision ID: 7a3424de
Revises: 648926728a34
Create Date: 2026-04-11 15:56:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = "7a3424de"
down_revision: Union[str, None] = "648926728a34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add Level 2 Meta Infrastructure Columns (Nullable first for safety)
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

    # 2. Onboarding Status (Additive & Defaulted)
    op.add_column(
        "tenant_whatsapp_integrations",
        sa.Column(
            "onboarding_status", sa.String(), server_default="pending", nullable=False
        ),
    )

    # 3. Webhook Uniqueness Guard (Level 2)
    # We use a naming convention that matches existing ones for consistency
    # Note: Postgres allows multiple NULLs in a UNIQUE index.
    conn = op.get_bind()
    # Check if we have duplicates before adding the constraint to avoid terminal failure
    res = conn.execute(
        sa.text(
            "SELECT phone_number_id FROM tenant_whatsapp_integrations WHERE phone_number_id IS NOT NULL GROUP BY phone_number_id HAVING COUNT(*) > 1"
        )
    ).first()
    if res:
        # If duplicates exist, we can't add the constraint. For Level 2, we fail early with a clear message in logs.
        raise Exception(
            f"DATA INTEGRITY ERROR: Duplicate phone_number_id detected ({res[0]}). Cannot enforce uniqueness."
        )

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
