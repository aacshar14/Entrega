"""Phase 2 Observability: WhatsApp Onboarding & Inbound
Revision ID: f8b1234b
Revises: 8b1234ef
Create Date: 2026-04-11 12:15:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = 'f8b1234b'
down_revision = '8b1234ef'
branch_labels = None
depends_on = None

def upgrade():
    # Upgrade TenantWhatsAppIntegration for onboarding observability
    op.add_column('tenant_whatsapp_integrations', sa.Column('last_error_code', sa.String(), nullable=True))
    op.add_column('tenant_whatsapp_integrations', sa.Column('last_error_message', sa.String(), nullable=True))
    op.add_column('tenant_whatsapp_integrations', sa.Column('last_attempt_at', sa.DateTime(), nullable=True))
    
    # Upgrade WhatsAppMessage for inbound processing observability
    op.add_column('whatsapp_messages', sa.Column('last_error_code', sa.String(), nullable=True))
    # Note: last_error already exists as a Text column from previous patch

def downgrade():
    op.drop_column('whatsapp_messages', 'last_error_code')
    op.drop_column('tenant_whatsapp_integrations', 'last_attempt_at')
    op.drop_column('tenant_whatsapp_integrations', 'last_error_message')
    op.drop_column('tenant_whatsapp_integrations', 'last_error_code')
