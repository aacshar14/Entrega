from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, require_active_billing
from app.models.models import (
    User,
    Tenant,
    InventoryMovement,
    Customer,
    Product,
    StockBalance,
    CustomerBalance,
)
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel


class MovementManualCreate(BaseModel):
    product_id: UUID
    quantity: float
    type: str
    customer_id: Optional[UUID] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None

class MovementUpdate(BaseModel):
    product_id: Optional[UUID] = None
    quantity: Optional[float] = None
    type: Optional[str] = None
    customer_id: Optional[UUID] = None
    unit_price: Optional[float] = None
    description: Optional[str] = None


router = APIRouter()


@router.get(
    "/",
    response_model=List[InventoryMovement],
    dependencies=[Depends(require_roles(["owner", "operator"]))],
)
@router.get(
    "",
    response_model=List[InventoryMovement],
    dependencies=[Depends(require_roles(["owner", "operator"]))],
)
async def list_movements(
    db: Session = Depends(get_session),
    tenant: Tenant = Depends(require_active_billing),
):
    """List all inventory movements for the tenant."""
    movements = db.exec(
        select(InventoryMovement).where(InventoryMovement.tenant_id == tenant.id)
    ).all()
    return movements


@router.post("/manual", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def create_manual_movement(
    movement: MovementManualCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_active_billing),
):
    """Create a manual inventory movement with automated tier-pricing for deliveries."""
    product_id = movement.product_id
    quantity = movement.quantity
    type = movement.type
    customer_id = movement.customer_id
    description = movement.description

    from app.models.models import Customer, Product

    # 1. Fetch Product for SKU and basic info
    product = db.get(Product, product_id)
    if not product or product.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Product not found")

    unit_price = 0.0
    tier_applied = None

    # 2. If customer-facing movement, enforce customer_id and get snapshot
    customer_name_snapshot = None
    if type in [
        "delivery",
        "return",
        "sale_reported",
        "delivery_to_customer",
        "return_from_customer",
    ]:
        if (
            not customer_id
            or str(customer_id) == "00000000-0000-0000-0000-000000000000"
        ):
            raise HTTPException(
                status_code=400,
                detail=f"A valid Customer ID is required for movement type: {type}. Placeholder IDs are not allowed.",
            )

        customer = db.get(Customer, customer_id)
        if not customer or customer.tenant_id != tenant.id:
            raise HTTPException(
                status_code=404, detail="Customer not found in your tenant"
            )
        customer_name_snapshot = customer.name

        # Enforce Signs for Business Logic
        if type in ["delivery", "delivery_to_customer"]:
            quantity = -abs(quantity)  # Decreases warehouse
        elif type in ["return", "return_from_customer", "sale_reported", "restock"]:
            quantity = abs(quantity)  # Addition or offset

        # Resolve price tier if it's a delivery
        if type in ["delivery", "delivery_to_customer"]:
            if customer.tier == "mayoreo":
                unit_price = product.price_mayoreo or product.price
                tier_applied = "mayoreo"
            elif customer.tier == "especial":
                unit_price = product.price_especial or product.price
                tier_applied = "especial"
            else:
                unit_price = product.price_menudeo or product.price
                tier_applied = "menudeo"
            
            # 🛡️ Hardening: If still 0, ensure we use the canonical base price
            if not unit_price:
                unit_price = product.price

    # 3. Create Movement
    new_movement = InventoryMovement(
        tenant_id=tenant.id,
        product_id=product.id,
        customer_id=customer_id,
        customer_name_snapshot=customer_name_snapshot,
        quantity=quantity,
        type=type,
        description=description,
        sku=product.sku,
        tier_applied=tier_applied,
        unit_price=unit_price,
        total_amount=abs(quantity) * unit_price,
        created_by_user_id=current_user.id,
    )

    db.add(new_movement)

    # 4. Synchronize with StockBalance (Warehouse Stock)
    if type != "sale_reported":
        from app.models.models import StockBalance

        balance = db.exec(
            select(StockBalance)
            .where(StockBalance.product_id == product.id, StockBalance.tenant_id == tenant.id)
            .with_for_update()
        ).first()
        if balance:
            balance.quantity += quantity
            balance.updated_by_user_id = current_user.id
            balance.last_updated = datetime.now(timezone.utc)
            db.add(balance)
        else:
            balance = StockBalance(
                tenant_id=tenant.id,
                product_id=product.id,
                quantity=quantity,
                updated_by_user_id=current_user.id,
            )
            db.add(balance)

    # 5. Synchronize with CustomerBalance (Financial Debt)
    if customer_id and type in [
        "delivery",
        "delivery_to_customer",
        "return",
        "return_from_customer",
    ]:
        from app.models.models import CustomerBalance

        cb = db.exec(
            select(CustomerBalance)
            .where(CustomerBalance.customer_id == customer_id, CustomerBalance.tenant_id == tenant.id)
            .with_for_update()
        ).first()

        amount_delta = new_movement.total_amount
        if type in ["delivery", "delivery_to_customer"]:
            amount_delta = -amount_delta

        # Financial Sync - Atomic Update
        print(f"[FINANCIAL SYNC] Customer: {customer_id} | Delta: {amount_delta} | Type: {type}")

        if cb:
            cb.balance += amount_delta
            cb.last_updated = datetime.now(timezone.utc)
            db.add(cb)
        else:
            cb = CustomerBalance(
                tenant_id=tenant.id,
                customer_id=customer_id,
                balance=amount_delta,
                last_updated=datetime.now(timezone.utc),
            )
            db.add(cb)

    db.commit()
    db.refresh(new_movement)
    return new_movement


@router.get(
    "/customer-inventory/summary",
    dependencies=[Depends(require_roles(["owner", "operator"]))],
)
async def get_customer_inventory_summary(
    db: Session = Depends(get_session),
    tenant: Tenant = Depends(require_active_billing),
):
    """
    Returns a pivoted summary of inventory 'outside' per customer.
    One row per customer, quantities per active SKU in 'quantities' dict.
    """
    # 1. Get all active products for the tenant to define columns
    products = db.exec(
        select(Product).where(Product.tenant_id == tenant.id)
    ).all()
    active_skus = [p.sku for p in products]
    sku_name_map = {p.sku: p.name for p in products}

    # 2. Aggregate movements (Deliveries decrease HQ stock, so qty_outside = -Sum(qty))
    outside_types = [
        "delivery",
        "delivery_to_customer",
        "return",
        "return_from_customer",
        "sale_reported",
    ]

    query = (
        select(
            InventoryMovement.customer_id,
            InventoryMovement.customer_name_snapshot,
            InventoryMovement.sku,
            func.sum(InventoryMovement.quantity).label("total_qty"),
            func.max(InventoryMovement.created_at).label("last_movement"),
        )
        .where(InventoryMovement.tenant_id == tenant.id)
        .where(InventoryMovement.customer_id != None)
        .where(InventoryMovement.type.in_(outside_types))
        .group_by(
            InventoryMovement.customer_id,
            InventoryMovement.customer_name_snapshot,
            InventoryMovement.sku,
        )
    )

    results = db.exec(query).all()

    # 3. Pivot logic
    summary_map = {}  # customer_id -> summary_object

    for cust_id, cust_name, sku, total_signed_qty, last_at in results:
        cid_str = str(cust_id)
        if cid_str not in summary_map:
            # Fallback for old records
            final_name = cust_name
            if not final_name:
                final_name = (
                    db.exec(select(Customer.name).where(Customer.id == cust_id)).first()
                    or "Desconocido"
                )

            summary_map[cid_str] = {
                "customer_id": cid_str,
                "customer_name": final_name,
                "quantities": {sku_code: 0 for sku_code in active_skus},
                "total_outside": 0,
                "last_movement_at": last_at,
            }

        qty_outside = -total_signed_qty
        if sku in active_skus:
            summary_map[cid_str]["quantities"][sku] = qty_outside

        summary_map[cid_str]["total_outside"] += qty_outside

        # Update last movement if more recent
        if not summary_map[cid_str]["last_movement_at"] or (
            last_at and last_at > summary_map[cid_str]["last_movement_at"]
        ):
            summary_map[cid_str]["last_movement_at"] = last_at

    # Convert to list and sort by name
    summary_list = list(summary_map.values())
    summary_list.sort(key=lambda x: x["customer_name"])

    return summary_list


@router.get(
    "/customer-inventory", dependencies=[Depends(require_roles(["owner", "operator"]))]
)
async def get_customer_inventory(
    db: Session = Depends(get_session),
    tenant: Tenant = Depends(require_active_billing),
):
    """
    Returns current inventory 'outside' (at customer locations).
    Derived from summing: delivery (+), sale_reported (-), return (-).
    Note: In our DB, delivery is stored as negative quantity (HQ decrease).
    To show positive 'outside' qty, we flip the sum.
    """
    from sqlalchemy import func
    from app.models.models import Product

    # Aggregate by customer and SKU
    # We filter by movements that affect 'outside' stock
    # delivery/delivery_to_customer (decreases HQ, increases outside)
    # return/return_from_customer (increases HQ, decreases outside)
    # sale_reported (decreases outside, affects finance)

    outside_types = [
        "delivery",
        "delivery_to_customer",
        "return",
        "return_from_customer",
        "sale_reported",
    ]

    # We use a subquery or direct aggregation
    # For speed, we'll iterate or use a group_by
    # SQLModel/SQLAlchemy approach:
    query = (
        select(
            InventoryMovement.customer_id,
            InventoryMovement.customer_name_snapshot,
            InventoryMovement.sku,
            func.sum(InventoryMovement.quantity).label("total_qty"),
            func.max(InventoryMovement.created_at).label("last_movement"),
        )
        .where(InventoryMovement.tenant_id == tenant.id)
        .where(InventoryMovement.customer_id != None)
        .where(InventoryMovement.type.in_(outside_types))
        .group_by(
            InventoryMovement.customer_id,
            InventoryMovement.customer_name_snapshot,
            InventoryMovement.sku,
        )
    )

    results = db.exec(query).all()

    inventory_list = []
    for cust_id, cust_name, sku, total_signed_qty, last_at in results:
        # Since delivery is negative in DB, total_signed_qty will be negative if stock is outside
        # We flip it to show positive 'outside' quantity
        qty_outside = -total_signed_qty

        if qty_outside == 0:
            continue  # Don't show settled inventory

        # Fallback for old records where snapshot was NULL
        final_cust_name = cust_name
        if not final_cust_name:
            from app.models.models import Customer

            final_cust_name = (
                db.exec(select(Customer.name).where(Customer.id == cust_id)).first()
                or "Desconocido"
            )

        # Get product name for friendly display
        p_name = (
            db.exec(
                select(Product.name).where(
                    Product.sku == sku, Product.tenant_id == tenant.id
                )
            ).first()
            or sku
        )

        inventory_list.append(
            {
                "customer_id": str(cust_id),
                "customer_name": final_cust_name,
                "sku": sku,
                "product_name": p_name,
                "quantity_outside": qty_outside,
                "last_movement_at": last_at.isoformat() if last_at else None,
            }
        )

    return inventory_list


@router.patch("/{id}", dependencies=[Depends(require_roles(["owner"]))])
async def update_movement(
    id: UUID,
    update: MovementUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(require_active_billing),
):
    """Update a movement's core data (owner only) and trigger full reconciliation."""
    movement = db.get(InventoryMovement, id)
    if not movement or movement.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Movement not found")

    # Update fields if provided
    if update.product_id:
        movement.product_id = update.product_id
    if update.quantity is not None:
        movement.quantity = update.quantity
    if update.type:
        movement.type = update.type
    if update.customer_id:
        movement.customer_id = update.customer_id
    if update.unit_price is not None:
        movement.unit_price = update.unit_price
    if update.description:
        movement.description = update.description

    # Recalculate total_amount if quantity or unit_price changed
    movement.total_amount = abs(movement.quantity) * movement.unit_price
    
    movement.updated_by_user_id = current_user.id
    movement.updated_at = datetime.now(timezone.utc)

    db.add(movement)
    db.commit()
    
    # TRIGGER RECONCILIATION: Cascade the update to all balances
    await reconcile_all(db, tenant)
    
    db.refresh(movement)
    return movement


@router.post("/reconcile-all")
async def reconcile_all(
    db: Session = Depends(get_session),
    tenant: Tenant = Depends(require_active_billing),
):
    """Utility to recalculate all balances from movement history, scoped to active tenant."""
    from sqlalchemy import text

    try:
        # 1. Correct signs for delivery movements (positive -> negative)
        db.execute(
            text("""
            UPDATE inventory_movements 
            SET quantity = -ABS(quantity) 
            WHERE tenant_id = :tid 
              AND type IN ('delivery', 'delivery_to_customer') 
              AND quantity > 0
        """),
            {"tid": tenant.id},
        )

        # 2. Reconstruct Stock Balances (All products for tenant)
        db.execute(
            text("DELETE FROM stock_balances WHERE tenant_id = :tid"),
            {"tid": tenant.id},
        )
        sql_stock = """
        INSERT INTO stock_balances (id, tenant_id, product_id, quantity, last_updated)
        SELECT 
            gen_random_uuid(), 
            p.tenant_id, 
            p.id, 
            COALESCE(SUM(m.quantity), 0), 
            NOW()
        FROM products p
        LEFT JOIN inventory_movements m ON p.id = m.product_id AND m.type != 'sale_reported'
        WHERE p.tenant_id = :tid
        GROUP BY p.tenant_id, p.id;
        """
        db.execute(text(sql_stock), {"tid": tenant.id})

        # 3. Reconstruct Customer Balances (All customers for tenant)
        db.execute(
            text("DELETE FROM customer_balances WHERE tenant_id = :tid"),
            {"tid": tenant.id},
        )
        sql_customers = """
        INSERT INTO customer_balances (id, tenant_id, customer_id, balance, last_updated)
        SELECT 
            gen_random_uuid(), 
            c.tenant_id, 
            c.id,
            COALESCE(m_bal.move_balance, 0) + COALESCE(p_count.pay_total, 0),
            NOW()
        FROM customers c
        LEFT JOIN (
            SELECT 
                customer_id, 
                SUM(CASE 
                    WHEN type IN ('delivery', 'delivery_to_customer') THEN -ABS(COALESCE(NULLIF(total_amount, 0), quantity * unit_price))
                    WHEN type IN ('return', 'return_from_customer') THEN ABS(COALESCE(NULLIF(total_amount, 0), quantity * unit_price))
                    ELSE 0 
                END) as move_balance
            FROM inventory_movements
            WHERE tenant_id = :tid
            GROUP BY customer_id
        ) m_bal ON c.id = m_bal.customer_id
        LEFT JOIN (
            SELECT customer_id, SUM(amount) as pay_total
            FROM payments
            WHERE tenant_id = :tid
            GROUP BY customer_id
        ) p_count ON c.id = p_count.customer_id
        WHERE c.tenant_id = :tid
        GROUP BY c.tenant_id, c.id, m_bal.move_balance, p_count.pay_total;
        """
        db.execute(text(sql_customers), {"tid": tenant.id})

        db.commit()

        # Verify counts
        stock_count = db.exec(
            select(func.count(StockBalance.id)).where(
                StockBalance.tenant_id == tenant.id
            )
        ).one()
        cust_count = db.exec(
            select(func.count(CustomerBalance.id)).where(
                CustomerBalance.tenant_id == tenant.id
            )
        ).one()

        return {
            "status": "success",
            "message": "All balances recalculated from history",
            "stats": {"stock_records": stock_count, "customer_records": cust_count},
        }
    except Exception as e:
        db.rollback()
        import traceback

        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}", dependencies=[Depends(require_roles(["owner"]))])
async def delete_movement(
    id: UUID,
    db: Session = Depends(get_session),
    tenant: Tenant = Depends(require_active_billing),
):
    """Delete a movement and trigger full reconciliation for data integrity (owner only)."""
    movement = db.get(InventoryMovement, id)
    if not movement or movement.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Movement not found")

    db.delete(movement)
    db.commit()

    # Trigger internal reconciliation to ensure balances match the new reality
    await reconcile_all(db, tenant.id)

    return {"status": "success", "message": "Movement deleted and balances reconciled"}
