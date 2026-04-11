"""Webhook V2 Hardening: Multi-Tenant Parsing & Idempotency
Revision ID: 8b1234ef
Revises: 7a3424de
Create Date: 2026-04-11 11:45:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = "8b1234ef"
down_revision = "7a3424de"
branch_labels = None
depends_on = None


def upgrade():
    # Update whatsapp_messages to Level 2 Auditing Audit spec
    op.add_column(
        "whatsapp_messages", sa.Column("phone_number_id", sa.String(), nullable=True)
    )
    op.add_column(
        "whatsapp_messages", sa.Column("sender_wa_id", sa.String(), nullable=True)
    )
    op.add_column(
        "whatsapp_messages",
        sa.Column(
            "processing_status", sa.String(), server_default="pending", nullable=False
        ),
    )
    op.add_column(
        "whatsapp_messages", sa.Column("processed_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "whatsapp_messages", sa.Column("last_error", sa.Text(), nullable=True)
    )

    # Indices for observability and reconciliation
    op.create_index(
        "idx_whatsapp_messages_status", "whatsapp_messages", ["processing_status"]
    )
    op.create_index(
        "idx_whatsapp_messages_tenant_status",
        "whatsapp_messages",
        ["tenant_id", "processing_status"],
    )


def downgrade():
    op.drop_index("idx_whatsapp_messages_tenant_status", table_name="whatsapp_messages")
    op.drop_index("idx_whatsapp_messages_status", table_name="whatsapp_messages")
    op.drop_column("whatsapp_messages", "last_error")
    op.drop_column("whatsapp_messages", "processed_at")
    op.drop_column("whatsapp_messages", "processing_status")
    op.drop_column("whatsapp_messages", "sender_wa_id")
    op.drop_column("whatsapp_messages", "phone_number_id")
