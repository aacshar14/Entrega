"""v1_6_4_notification_system

Revision ID: 9b8dd3cfcbf6
Revises: 412f47b2c7aa
Create Date: 2026-04-10 14:45:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "9b8dd3cfcbf6"
down_revision = "412f47b2c7aa"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notifications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=True),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("priority", sa.String(), nullable=False, server_default="medium"),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("cta_label", sa.String(), nullable=True),
        sa.Column("cta_link", sa.String(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("metadata_json", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
    )
    op.create_index(
        op.f("ix_notifications_category"), "notifications", ["category"], unique=False
    )
    op.create_index(
        op.f("ix_notifications_is_read"), "notifications", ["is_read"], unique=False
    )
    op.create_index(
        op.f("ix_notifications_priority"), "notifications", ["priority"], unique=False
    )
    op.create_index(
        op.f("ix_notifications_tenant_id"), "notifications", ["tenant_id"], unique=False
    )


def downgrade():
    op.drop_table("notifications")
