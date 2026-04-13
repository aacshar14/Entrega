"""add_onboarding_v2_3_state

Revision ID: bdb22424235f
Revises: d24caa5bc67f
Create Date: 2026-04-13 07:31:16.103734

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'bdb22424235f'
down_revision: Union[str, None] = 'd24caa5bc67f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add onboarding columns with server defaults (Fast in Postgres)
    # This avoids NOT NULL violations on existing data during addition.
    op.add_column('tenants', sa.Column('onboarding_state', sa.String(), nullable=False, server_default='created'))
    op.add_column('tenants', sa.Column('onboarding_step', sa.Integer(), nullable=False, server_default='1'))
    
    # 2. Fix plan_code nulls for existing data
    op.execute("UPDATE tenants SET plan_code = 'basic_monthly' WHERE plan_code IS NULL")
    
    # 3. Apply constraints to plan_code
    op.alter_column('tenants', 'plan_code',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # 4. Create Indexes
    op.create_index(op.f('ix_tenants_billing_status'), 'tenants', ['billing_status'], unique=False)
    op.create_index(op.f('ix_tenants_onboarding_state'), 'tenants', ['onboarding_state'], unique=False)
    
    # Note: Accidental changes to tenant_users and users from autogenerate have been REMOVED 
    # to prevent unnecessary DDL and potential locking issues.


def downgrade() -> None:
    op.drop_index(op.f('ix_tenants_onboarding_state'), table_name='tenants')
    # Use if_exists=True or check before drop if manually cleaning up
    op.drop_index(op.f('ix_tenants_billing_status'), table_name='tenants')
    
    op.alter_column('tenants', 'plan_code',
               existing_type=sa.VARCHAR(),
               nullable=True)
               
    op.drop_column('tenants', 'onboarding_step')
    op.drop_column('tenants', 'onboarding_state')
