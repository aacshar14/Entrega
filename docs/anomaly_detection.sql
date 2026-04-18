-- =============================================================================
-- Entrega Platform — Anomaly Detection Queries
-- Phase 2 Hardening (2026-04-14)
--
-- Location: docs/anomaly_detection.sql
-- Usage:    Run via Supabase SQL Editor or psql — READ ONLY queries.
--           Never modify data through this file.
--           Run these after any bulk operation or before enabling WhatsApp.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. IMPOSSIBLE NEGATIVE WAREHOUSE STOCK
--    Any row here means a bug in the write path — stock was decremented below 0.
-- -----------------------------------------------------------------------------
SELECT
    sb.id,
    sb.tenant_id,
    sb.product_id,
    p.sku,
    p.name AS product_name,
    sb.quantity AS warehouse_qty,
    sb.last_updated
FROM stock_balances sb
JOIN products p ON p.id = sb.product_id
WHERE sb.quantity < 0
ORDER BY sb.quantity ASC;


-- -----------------------------------------------------------------------------
-- 2. DELIVERIES WITH MISSING OR ZERO total_amount
--    These corrupt customer_balances debt state.
--    Expected result: 0 rows after Phase 2 hardening.
-- -----------------------------------------------------------------------------
SELECT
    im.id,
    im.tenant_id,
    im.customer_id,
    im.customer_name_snapshot,
    im.product_id,
    im.sku,
    im.quantity,
    im.unit_price,
    im.total_amount,
    im.tier_applied,
    im.created_at
FROM inventory_movements im
WHERE im.type IN ('delivery', 'delivery_to_customer')
  AND (im.total_amount IS NULL OR im.total_amount = 0)
ORDER BY im.created_at DESC;


-- -----------------------------------------------------------------------------
-- 3. INVARIANT DRIFT CHECK
--    Compares persisted warehouse stock (stock_balances.quantity)
--    against the derived outside stock from inventory_movements.
--    Also shows the effective total for each product.
--
--    Interpretation:
--      warehouse_persisted = what stock_balances.quantity says (HQ stock)
--      outside_derived     = net units at customers (deliveries - returns)
--      total_system        = warehouse + outside (should be stable across deliveries)
-- -----------------------------------------------------------------------------
WITH outside AS (
    SELECT
        product_id,
        tenant_id,
        SUM(
            CASE
                WHEN type IN ('delivery', 'delivery_to_customer') THEN ABS(quantity)
                WHEN type IN ('return', 'return_from_customer', 'sale_reported') THEN -ABS(quantity)
                ELSE 0
            END
        ) AS qty_outside
    FROM inventory_movements
    GROUP BY product_id, tenant_id
)
SELECT
    sb.tenant_id,
    p.sku,
    p.name AS product_name,
    sb.quantity                            AS warehouse_persisted,
    COALESCE(o.qty_outside, 0)             AS outside_derived,
    sb.quantity + COALESCE(o.qty_outside, 0) AS total_system,
    sb.last_updated
FROM stock_balances sb
JOIN products p ON p.id = sb.product_id
LEFT JOIN outside o
    ON o.product_id = sb.product_id
    AND o.tenant_id = sb.tenant_id
ORDER BY sb.tenant_id, p.sku;


-- -----------------------------------------------------------------------------
-- 4. CUSTOMER BALANCE SANITY CHECK
--    Shows all customers with outstanding debt.
--    Cross-reference against movements to spot encoding errors.
-- -----------------------------------------------------------------------------
SELECT
    cb.tenant_id,
    c.name AS customer_name,
    cb.balance,
    cb.last_updated,
    (
        SELECT COALESCE(SUM(CASE
            WHEN im.type IN ('delivery', 'delivery_to_customer') THEN -ABS(im.total_amount)
            WHEN im.type IN ('return', 'return_from_customer') THEN ABS(im.total_amount)
            ELSE 0
        END), 0)
        FROM inventory_movements im
        WHERE im.customer_id = cb.customer_id
          AND im.tenant_id = cb.tenant_id
    ) AS movements_balance,
    (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        WHERE p.customer_id = cb.customer_id
          AND p.tenant_id = cb.tenant_id
    ) AS total_payments_received
FROM customer_balances cb
JOIN customers c ON c.id = cb.customer_id
WHERE cb.balance < 0
ORDER BY cb.balance ASC;


-- -----------------------------------------------------------------------------
-- 5. STOCK SUMMARY (Present State — matches dashboard orange banner)
--    Run this to verify: warehouse + outside = total (200 reconciled state)
-- -----------------------------------------------------------------------------
SELECT
    t.slug AS tenant,
    p.sku,
    p.name AS product_name,
    sb.quantity                            AS warehouse,
    COALESCE(o.qty_outside, 0)             AS outside,
    sb.quantity + COALESCE(o.qty_outside, 0) AS total
FROM stock_balances sb
JOIN products p ON p.id = sb.product_id
JOIN tenants t ON t.id = sb.tenant_id
LEFT JOIN (
    SELECT
        product_id,
        tenant_id,
        SUM(
            CASE
                WHEN type IN ('delivery', 'delivery_to_customer') THEN ABS(quantity)
                WHEN type IN ('return', 'return_from_customer', 'sale_reported') THEN -ABS(quantity)
                ELSE 0
            END
        ) AS qty_outside
    FROM inventory_movements
    GROUP BY product_id, tenant_id
) o ON o.product_id = sb.product_id AND o.tenant_id = sb.tenant_id
ORDER BY t.slug, p.sku;
