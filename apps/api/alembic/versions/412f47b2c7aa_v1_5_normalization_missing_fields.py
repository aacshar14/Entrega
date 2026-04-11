"""v1_5_normalization_missing_fields

Revision ID: 412f47b2c7aa
Revises: 7313ca3bd0fe
Create Date: 2026-04-10 13:42:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = "412f47b2c7aa"
down_revision: Union[str, None] = "7313ca3bd0fe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 🆕 Add missing V1.4 integration fields
    op.add_column(
        "tenant_whatsapp_integrations",
        sa.Column("token_expires_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "tenant_whatsapp_integrations",
        sa.Column(
            "display_phone_number", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
    )
    op.add_column(
        "tenant_whatsapp_integrations",
        sa.Column(
            "setup_completed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=True,
        ),
    )

    # 🔁 Column Rename Strategy: encrypted_access_token -> access_token_encrypted
    # This was previously handled by raw SQL but we formalize it here
    # We use a check to avoid errors if already renamed
    conn = op.get_bind()
    res = conn.execute(
        sa.text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='tenant_whatsapp_integrations' AND column_name='encrypted_access_token'"
        )
    ).first()
    if res:
        op.alter_column(
            "tenant_whatsapp_integrations",
            "encrypted_access_token",
            new_column_name="access_token_encrypted",
        )


def downgrade() -> None:
    op.drop_column("tenant_whatsapp_integrations", "setup_completed")
    op.drop_column("tenant_whatsapp_integrations", "display_phone_number")
    op.drop_column("tenant_whatsapp_integrations", "token_expires_at")
    # Note: access_token_encrypted rename is not safely reversible without data loss risk if both exist
