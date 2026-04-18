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
    """Create a manual inventory movement. Deliveries go through the shared inventory service."""
    from app.models.models import Customer, Product
    from app.services.inventory_service import execute_delivery

    product_id = movement.product_id
    quantity = abs(movement.quantity)  # Always work with positive; service handles sign
    mov_type = movement.type
    customer_id = movement.customer_id
    description = movement.description or "Movimiento manual"

    # 1. Fetch and validate Product
    product = db.get(Product, product_id)
    if not product or product.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Product not found")

    # --- DELIVERY PATH (canonical shared service) ---
    if mov_type in ["delivery", "delivery_to_customer"]:
        if (
            not customer_id
            or str(customer_id) == "00000000-0000-0000-0000-000000000000"
        ):
            raise HTTPException(
                status_code=400,
                detail=f"A valid Customer ID is required for movement type: {mov_type}.",
            )

        customer = db.get(Customer, customer_id)
        if not customer or customer.tenant_id != tenant.id:
            raise HTTPException(status_code=404, detail="Customer not found in your tenant")

        # Resolve tier price
        if customer.tier == "mayoreo":
            unit_price = product.price_mayoreo or product.price
            tier_applied = "mayoreo"
        elif customer.tier == "especial":
            unit_price = product.price_especial or product.price
            tier_applied = "especial"
        else:
            unit_price = product.price_menudeo or product.price
            tier_applied = "menudeo"

        if not unit_price:
            unit_price = product.price

        # Override with manual unit_price if explicitly provided
        if movement.unit_price is not None and movement.unit_price > 0:
            unit_price = movement.unit_price

        try:
            new_movement = execute_delivery(
                session=db,
                tenant=tenant,
                product=product,
                customer=customer,
                quantity=quantity,
                unit_price=unit_price,
                tier_applied=tier_applied,
                description=description,
                created_by_user_id=current_user.id,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        db.commit()
        db.refresh(new_movement)
        return new_movement

    # --- NON-DELIVERY PATH (restock, adjustment, production, return, sale_reported) ---
    unit_price = movement.unit_price or 0.0
    tier_applied = None
    customer_name_snapshot = None
    customer = None

    if mov_type in ["return", "return_from_customer", "sale_reported"]:
        if (
            not customer_id
            or str(customer_id) == "00000000-0000-0000-0000-000000000000"
        ):
            raise HTTPException(
                status_code=400,
                detail=f"A valid Customer ID is required for movement type: {mov_type}.",
            )
        customer = db.get(Customer, customer_id)
        if not customer or customer.tenant_id != tenant.id:
            raise HTTPException(status_code=404, detail="Customer not found in your tenant")
        customer_name_snapshot = customer.name

    # Signed quantity: returns/restock/production are positive, adjustments keep sign
    signed_qty = quantity
    if mov_type in ["return", "return_from_customer", "restock", "production", "adjustment"]:
        signed_qty = abs(quantity)  # These are additions to warehouse
    # adjustment: keep as-is (caller may pass negative for a reduction)

    new_movement = InventoryMovement(
        tenant_id=tenant.id,
        product_id=product.id,
        customer_id=customer_id,
        customer_name_snapshot=customer_name_snapshot,
        quantity=signed_qty,
        type=mov_type,
        description=description,
        sku=product.sku,
        tier_applied=tier_applied,
        unit_price=unit_price,
        total_amount=abs(signed_qty) * unit_price,
        created_by_user_id=current_user.id,
    )
    db.add(new_movement)

    # Sync StockBalance for non-financial movements
    if mov_type != "sale_reported":
        balance = db.exec(
            select(StockBalance)
            .where(StockBalance.product_id == product.id, StockBalance.tenant_id == tenant.id)
            .with_for_update()
        ).first()

        if balance:
            new_qty = balance.quantity + signed_qty
            # Hard guard: warehouse cannot go negative
            if new_qty < 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Esta operación dejaría el almacén en negativo "
                        f"(disponible: {balance.quantity}, delta: {signed_qty}). "
                        "Verifica la cantidad."
                    ),
                )
            balance.quantity = new_qty
            balance.updated_by_user_id = current_user.id
            balance.last_updated = datetime.now(timezone.utc)
            db.add(balance)
        else:
            if signed_qty < 0:
                raise HTTPException(
                    status_code=400,
                    detail="No existe stock registrado para este producto. No se puede reducir.",
                )
            balance = StockBalance(
                tenant_id=tenant.id,
                product_id=product.id,
                quantity=signed_qty,
                updated_by_user_id=current_user.id,
            )
            db.add(balance)

    # Sync CustomerBalance for returns
    if customer_id and mov_type in ["return", "return_from_customer"]:
        total_amount = abs(signed_qty) * unit_price
        cb = db.exec(
            select(CustomerBalance)
            .where(CustomerBalance.customer_id == customer_id, CustomerBalance.tenant_id == tenant.id)
            .with_for_update()
        ).first()
        if cb:
            cb.balance += total_amount
            cb.last_updated = datetime.now(timezone.utc)
            db.add(cb)
        else:
            cb = CustomerBalance(
                tenant_id=tenant.id,
                customer_id=customer_id,
                balance=total_amount,
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
    """Update a movement's metadata (owner only). Does NOT auto-reconcile stock."""
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
    db.refresh(movement)
    return movement


@router.post("/reconcile-all", dependencies=[Depends(require_roles(["owner"]))])
async def reconcile_all(
    db: Session = Depends(get_session),
    tenant: Tenant = Depends(require_active_billing),
):
    """
    RUNBOOK-ONLY: Recalculates all balances from movement history.
    DISABLED in production to protect manually reconciled stock state.
    Run only via a controlled migration script after explicit approval.
    """
    from app.core.config import settings
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403,
            detail=(
                "reconcile_all is DISABLED in production to protect reconciled stock state. "
                "Run manually via the admin runbook only."
            ),
        )
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
    """Delete a movement (owner only). Does NOT auto-reconcile stock."""
    movement = db.get(InventoryMovement, id)
    if not movement or movement.tenant_id != tenant.id:
        raise HTTPException(status_code=404, detail="Movement not found")

    db.delete(movement)
    db.commit()

    return {"status": "success", "message": "Movement deleted"}
