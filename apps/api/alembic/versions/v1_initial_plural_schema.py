"""initial schema plural naming

Revision ID: v1_initial_plural_schema
Revises:
Create Date: 2026-04-03 13:45:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "v1_initial_plural_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Tenants
    op.create_table(
        "tenants",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("logo_url", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("timezone", sa.String(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False),
        sa.Column("business_name", sa.String(), nullable=True),
        sa.Column("business_whatsapp_number", sa.String(), nullable=True),
        sa.Column("clients_imported", sa.Boolean(), nullable=False),
        sa.Column("stock_imported", sa.Boolean(), nullable=False),
        sa.Column("business_whatsapp_connected", sa.Boolean(), nullable=False),
        sa.Column("ready", sa.Boolean(), nullable=False),
        sa.Column("whatsapp_status", sa.String(), nullable=False),
        sa.Column("whatsapp_app_id", sa.String(), nullable=True),
        sa.Column("whatsapp_connected_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tenants_name"), "tenants", ["name"], unique=False)
    op.create_index(op.f("ix_tenants_slug"), "tenants", ["slug"], unique=True)

    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("platform_role", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("auth_provider_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_users_auth_provider_id"), "users", ["auth_provider_id"], unique=True
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Tenant Users (Memberships)
    op.create_table(
        "tenant_users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("tenant_role", sa.String(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_tenant_users_tenant_id"), "tenant_users", ["tenant_id"], unique=False
    )
    op.create_index(
        op.f("ix_tenant_users_user_id"), "tenant_users", ["user_id"], unique=False
    )

    # WhatsApp Config
    op.create_table(
        "whatsapp_configs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("waba_id", sa.String(), nullable=True),
        sa.Column("phone_number_id", sa.String(), nullable=True),
        sa.Column("display_phone_number", sa.String(), nullable=True),
        sa.Column("whatsapp_business_account_name", sa.String(), nullable=True),
        sa.Column("encrypted_access_token", sa.String(), nullable=True),
        sa.Column("connected_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_whatsapp_configs_tenant_id"),
        "whatsapp_configs",
        ["tenant_id"],
        unique=True,
    )

    # Customers
    op.create_table(
        "customers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("phone_number", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("tier", sa.String(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_customers_name"), "customers", ["name"], unique=False)
    op.create_index(
        op.f("ix_customers_phone_number"), "customers", ["phone_number"], unique=True
    )

    # Products
    op.create_table(
        "products",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("sku", sa.String(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("price_mayoreo", sa.Float(), nullable=False),
        sa.Column("price_menudeo", sa.Float(), nullable=False),
        sa.Column("price_especial", sa.Float(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_products_name"), "products", ["name"], unique=False)
    op.create_index(op.f("ix_products_sku"), "products", ["sku"], unique=False)

    # Stock Balances
    op.create_table(
        "stock_balances",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("updated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("last_updated", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Inventory Movements
    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("customer_id", sa.UUID(), nullable=True),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("sku", sa.String(), nullable=True),
        sa.Column("tier_applied", sa.String(), nullable=True),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Payments
    op.create_table(
        "payments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("customer_id", sa.UUID(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Customer Balances
    op.create_table(
        "customer_balances",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("customer_id", sa.UUID(), nullable=False),
        sa.Column("balance", sa.Float(), nullable=False),
        sa.Column("last_updated", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("customer_balances")
    op.drop_table("payments")
    op.drop_table("inventory_movements")
    op.drop_table("stock_balances")
    op.drop_table("products")
    op.drop_table("customers")
    op.drop_table("whatsapp_configs")
    op.drop_table("tenant_users")
    op.drop_table("users")
    op.drop_table("tenants")
