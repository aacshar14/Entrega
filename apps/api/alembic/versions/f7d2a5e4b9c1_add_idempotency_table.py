"""add idempotency table

Revision ID: f7d2a5e4b9c1
Revises: b4adb55e6167
Create Date: 2026-04-10 02:22:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f7d2a5e4b9c1"
down_revision: Union[str, None] = "b4adb55e6167"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "processed_messages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="processing"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "message_id", name="uq_tenant_message_id"),
    )
    op.create_index(
        op.f("ix_processed_messages_message_id"),
        "processed_messages",
        ["message_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_processed_messages_status"),
        "processed_messages",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_processed_messages_tenant_id"),
        "processed_messages",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "idx_processed_messages_status_updated",
        "processed_messages",
        ["status", "updated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_processed_messages_status_updated", table_name="processed_messages"
    )
    op.drop_index(
        op.f("ix_processed_messages_tenant_id"), table_name="processed_messages"
    )
    op.drop_index(op.f("ix_processed_messages_status"), table_name="processed_messages")
    op.drop_index(
        op.f("ix_processed_messages_message_id"), table_name="processed_messages"
    )
    op.drop_table("processed_messages")
