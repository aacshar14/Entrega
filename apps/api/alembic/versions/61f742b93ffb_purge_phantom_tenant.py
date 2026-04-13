"""purge phantom tenant

Revision ID: 61f742b93ffb
Revises: bdb22424235f
Create Date: 2026-04-13 16:58:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '61f742b93ffb'
down_revision = 'bdb22424235f'
branch_labels = None
depends_on = None

# V3.6.1: Forced trigger for pipeline stabilization
ZERO_UUID = '00000000-0000-0000-0000-000000000000'

def upgrade():
    # 🛡️ DATA INTEGRITY (V3.5.0): Purge dev placeholder from production runtime
    # 1. Invalidate Tenant
    op.execute(
        f"UPDATE tenants SET status = 'deleted', slug = 'deleted_phantom_' || id::text "
        f"WHERE id = '{ZERO_UUID}'"
    )
    # 2. Break User Memberships
    op.execute(
        f"DELETE FROM tenant_users WHERE tenant_id = '{ZERO_UUID}'"
    )
    # 3. Cleanup associated integrations if any
    op.execute(
        f"DELETE FROM tenant_whatsapp_integrations WHERE tenant_id = '{ZERO_UUID}'"
    )

def downgrade():
    # Downgrade logic exists but phantom should NOT be restored in production
    op.execute(
        f"UPDATE tenants SET status = 'active', slug = 'placeholder' "
        f"WHERE id = '{ZERO_UUID}'"
    )
