"""
inventory_service.py — Canonical inventory write path (Phase 2 Hardening)

All delivery and payment mutations MUST go through these functions.
No direct stock mutations are permitted outside this module.

Rules enforced here:
- Delivery: warehouse cannot go negative
- Delivery: unit_price must be > 0
- Payment: does NOT touch stock (ever)
- All writes are additive to the session; the CALLER must commit.
"""

from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlmodel import Session, select

from app.models.models import (
    Tenant,
    Product,
    Customer,
    StockBalance,
    CustomerBalance,
    InventoryMovement,
    Payment,
)
from app.core.logging import logger


def execute_delivery(
    session: Session,
    tenant: Tenant,
    product: Product,
    customer: Customer,
    quantity: int,
    unit_price: float,
    tier_applied: str,
    description: str = "Entrega a consignación",
    created_by_user_id: Optional[UUID] = None,
) -> InventoryMovement:
    """
    Single canonical path for all consignment deliveries.

    Called by:
      - movements.py::create_manual_movement (Operations)
      - parser.py::execute_order (WhatsApp)

    Guarantees:
      1. quantity > 0
      2. unit_price > 0 (no $0 delivery allowed)
      3. warehouse stock sufficient (no negative)
      4. InventoryMovement created (type=delivery_to_customer, qty negative)
      5. stock_balances.quantity decremented
      6. customer_balances.balance decremented
      7. Returns unsaved movement; CALLER must commit.
    """
    # --- Guard 1: quantity must be positive ---
    if quantity <= 0:
        raise ValueError(f"Quantity must be positive for a delivery. Got: {quantity}")

    # --- Guard 2: price must be configured ---
    if unit_price <= 0:
        raise ValueError(
            f"Product '{product.name}' has no valid price configured for tier "
            f"'{tier_applied}'. Set a price before recording a delivery."
        )

    total_amount = quantity * unit_price

    # --- Guard 3: lock and check warehouse stock ---
    balance = session.exec(
        select(StockBalance)
        .where(
            StockBalance.tenant_id == tenant.id,
            StockBalance.product_id == product.id,
        )
        .with_for_update()
    ).first()

    if not balance:
        # Create a zero-balance row if this product was never stocked
        balance = StockBalance(
            tenant_id=tenant.id,
            product_id=product.id,
            quantity=0,
            updated_by_user_id=created_by_user_id,
        )
        session.add(balance)
        session.flush()  # Get an ID before checking

    if balance.quantity < quantity:
        logger.error(
            "inventory.insufficient_stock",
            sku=product.sku,
            available=balance.quantity,
            requested=quantity,
            tenant_id=str(tenant.id),
        )
        raise ValueError(
            f"Stock insuficiente para '{product.sku}': "
            f"disponible {balance.quantity}, solicitado {quantity}"
        )

    # --- Step 4: Create InventoryMovement ---
    movement = InventoryMovement(
        tenant_id=tenant.id,
        product_id=product.id,
        customer_id=customer.id,
        customer_name_snapshot=customer.name,
        quantity=-quantity,  # Negative: left warehouse → went to customer
        type="delivery_to_customer",
        description=description,
        sku=product.sku,
        tier_applied=tier_applied,
        unit_price=unit_price,
        total_amount=total_amount,
        created_by_user_id=created_by_user_id,
    )
    session.add(movement)

    # --- Step 5: Decrement warehouse stock ---
    balance.quantity -= quantity
    balance.last_updated = datetime.now(timezone.utc)
    if created_by_user_id:
        balance.updated_by_user_id = created_by_user_id
    session.add(balance)

    # --- Step 6: Decrement customer balance (increase debt) ---
    cust_balance = session.exec(
        select(CustomerBalance)
        .where(
            CustomerBalance.tenant_id == tenant.id,
            CustomerBalance.customer_id == customer.id,
        )
        .with_for_update()
    ).first()

    if not cust_balance:
        cust_balance = CustomerBalance(
            tenant_id=tenant.id,
            customer_id=customer.id,
            balance=0.0,
        )
        session.add(cust_balance)
        session.flush()

    cust_balance.balance -= total_amount
    cust_balance.last_updated = datetime.now(timezone.utc)
    session.add(cust_balance)

    logger.info(
        "inventory.delivery_staged",
        sku=product.sku,
        quantity=quantity,
        unit_price=unit_price,
        tier=tier_applied,
        customer=customer.name,
        tenant_id=str(tenant.id),
    )

    return movement


def execute_payment(
    session: Session,
    tenant: Tenant,
    customer: Customer,
    amount: float,
    method: str,
    created_by_user_id: Optional[UUID] = None,
) -> Payment:
    """
    Single canonical path for all customer payments.

    Called by:
      - payments.py::create_payment (Operations)
      - parser.py::execute_payment (WhatsApp)

    Guarantees:
      1. amount > 0
      2. Payment record created
      3. customer_balances.balance incremented (debt reduced)
      4. Stock is NEVER touched
      5. Returns unsaved payment; CALLER must commit.
    """
    # --- Guard: amount must be positive ---
    if amount <= 0:
        raise ValueError(f"Payment amount must be positive. Got: {amount}")

    # --- Step 1: Create Payment record ---
    payment = Payment(
        tenant_id=tenant.id,
        customer_id=customer.id,
        amount=amount,
        method=method,
        created_by_user_id=created_by_user_id,
    )
    session.add(payment)

    # --- Step 2: Increment customer balance (reduces debt) ---
    cust_balance = session.exec(
        select(CustomerBalance)
        .where(
            CustomerBalance.tenant_id == tenant.id,
            CustomerBalance.customer_id == customer.id,
        )
        .with_for_update()
    ).first()

    if not cust_balance:
        cust_balance = CustomerBalance(
            tenant_id=tenant.id,
            customer_id=customer.id,
            balance=0.0,
        )
        session.add(cust_balance)
        session.flush()

    cust_balance.balance += amount
    cust_balance.last_updated = datetime.now(timezone.utc)
    session.add(cust_balance)

    # Stock is never touched. This comment is intentional documentation.

    logger.info(
        "inventory.payment_staged",
        customer=customer.name,
        amount=amount,
        method=method,
        tenant_id=str(tenant.id),
    )

    return payment
