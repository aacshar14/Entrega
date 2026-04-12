from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlmodel import Session, select, func, text
from app.models.models import (
    MetricSnapshot,
    Tenant,
    InventoryMovement,
    Payment,
    CustomerBalance,
    StockBalance,
)
from app.core.logging import logger


class DashboardService:
    """
    Performance-optimized dashboard service.
    Implements a write-through or lazy-refresh snapshot pattern to avoid
    heavy runtime aggregations over large tables.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_metric(
        self, tenant_id: UUID, metric_name: str, date: datetime
    ) -> Optional[float]:
        """Reads a metric from the snapshot table for a specific day."""
        period_start = date.replace(hour=0, minute=0, second=0, microsecond=0)

        snapshot = self.db.exec(
            select(MetricSnapshot).where(
                MetricSnapshot.tenant_id == tenant_id,
                MetricSnapshot.metric_name == metric_name,
                MetricSnapshot.period_start == period_start,
            )
        ).first()

        return snapshot.metric_value if snapshot else None

    def refresh_daily_kpis(self, tenant_id: UUID, date: datetime = None):
        """
        Recomputes expensive KPIs and persists them as Snapshots.
        Hardened for Phase 5 consistency: Increases update_counter.
        """
        if not date:
            date = datetime.now(timezone.utc)

        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        sales = (
            self.db.exec(
                select(func.sum(Payment.amount)).where(
                    Payment.tenant_id == tenant_id,
                    Payment.created_at >= day_start,
                    Payment.created_at < day_end,
                )
            ).first()
            or 0.0
        )

        # 2. Total Debt (Sum of negative balances)
        debt = abs(
            float(
                self.db.exec(
                    select(func.sum(CustomerBalance.balance)).where(
                        CustomerBalance.tenant_id == tenant_id,
                        CustomerBalance.balance < 0,
                    )
                ).first()
                or 0.0
            )
        )

        # 3. Deliveries (Count of movements)
        deliveries = (
            self.db.exec(
                select(func.count(InventoryMovement.id)).where(
                    InventoryMovement.tenant_id == tenant_id,
                    InventoryMovement.type == "delivery",
                    InventoryMovement.created_at >= day_start,
                    InventoryMovement.created_at < day_end,
                )
            ).first()
            or 0
        )

        kpis = {
            "sales_today": float(sales),
            "total_debt": float(debt),
            "deliveries_today": float(deliveries),
        }

        # Persist to Snapshots with Resilience Metadata
        for name, val in kpis.items():
            upsert_sql = text("""
                INSERT INTO metric_snapshots (
                    id, tenant_id, metric_name, metric_value, period_start, period_end, created_at, update_counter
                )
                VALUES (:id, :t_id, :name, :val, :start, :end, :now, 1)
                ON CONFLICT ON CONSTRAINT uq_metric_snapshot
                DO UPDATE SET 
                    metric_value = EXCLUDED.metric_value, 
                    created_at = EXCLUDED.created_at,
                    update_counter = metric_snapshots.update_counter + 1,
                    last_error_code = NULL
            """)
            import uuid

            self.db.execute(
                upsert_sql,
                {
                    "id": uuid.uuid4(),
                    "t_id": tenant_id,
                    "name": name,
                    "val": val,
                    "start": day_start,
                    "end": day_end,
                    "now": datetime.now(timezone.utc),
                },
            )

        self.db.commit()
        logger.info("dashboard.snapshots_refreshed", tenant_id=str(tenant_id))

    def reconcile_tenant_metrics(self, tenant_id: UUID, date: datetime = None):
        """
        Phase 5: Reconciliation Job.
        Compares MetricSnapshots against source-of-truth operational data.
        """
        import json
        from app.models.models import MetricReconciliation, MetricSnapshot

        if not date:
            date = datetime.now(timezone.utc)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)

        # 1. Fetch Current Snapshots
        snapshots = self.db.exec(
            select(MetricSnapshot).where(
                MetricSnapshot.tenant_id == tenant_id,
                MetricSnapshot.period_start == day_start,
            )
        ).all()
        snapshot_map = {s.metric_name: s.metric_value for s in snapshots}

        # 2. Compute "Real" Truth (Bounded Recompute)
        # Redundant logic for audit purposes
        truth_kpis = self._compute_authoritative_kpis(tenant_id, day_start)

        # 3. Detect Drift
        drift_detected = False
        drift_summary = None

        for name, truth_val in truth_kpis.items():
            snap_val = snapshot_map.get(name)
            if snap_val is None:
                drift_detected = True
                drift_summary = "SNAPSHOT_MISSING"
                break
            if abs(snap_val - truth_val) > 0.01:
                drift_detected = True
                drift_summary = "VALUE_MISMATCH"
                break

        # 4. Log Reconciliation Result
        recon = MetricReconciliation(
            tenant_id=tenant_id,
            metric_date=day_start,
            snapshot_values=json.dumps(snapshot_map),
            truth_values=json.dumps(truth_kpis),
            drift_detected=drift_detected,
            drift_summary=drift_summary,
        )
        self.db.add(recon)

        # 5. Update Snapshots with reconciliation status
        if snapshots:
            for s in snapshots:
                s.last_reconciled_at = datetime.now(timezone.utc)
                if drift_detected:
                    s.last_error_code = "DRIFT_DETECTED"
                self.db.add(s)

        self.db.commit()

        if drift_detected:
            logger.warning(
                "snapshot.drift_detected",
                tenant_id=str(tenant_id),
                summary=drift_summary,
            )
            # Auto-repair if designated
            self.refresh_daily_kpis(tenant_id, day_start)
            logger.info("snapshot.drift_repaired", tenant_id=str(tenant_id))
        else:
            logger.info("snapshot.reconciled_clean", tenant_id=str(tenant_id))

        return recon

    def get_dashboard_kpis(self, tenant: Tenant) -> Dict[str, float]:
        """
        Returns KPIs, preferring snapshots for performance.
        Falls back to bounded refresh if snapshots are missing or stale.
        🛡️ Hardening V2: Wrapped in global resilience layer to prevent 500s.
        """
        now = datetime.now(timezone.utc)

        try:
            # Try Snapshots first
            sales = self.get_metric(tenant.id, "sales_today", now)
            debt = self.get_metric(tenant.id, "total_debt", now)
            deliveries = self.get_metric(tenant.id, "deliveries_today", now)

            # FALLBACK SAFETY: If critical metrics are missing, refresh immediately (Bounded)
            if sales is None or debt is None or deliveries is None:
                logger.warning(
                    "dashboard.snapshot_miss_triggering_refresh",
                    tenant_id=str(tenant.id),
                )
                try:
                    self.refresh_daily_kpis(tenant.id, now)
                    # Re-read after refresh
                    sales = self.get_metric(tenant.id, "sales_today", now)
                    debt = self.get_metric(tenant.id, "total_debt", now)
                    deliveries = self.get_metric(tenant.id, "deliveries_today", now)
                except Exception as e:
                    logger.error(
                        "dashboard.refresh_failed_using_authoritative", error=str(e)
                    )
                    return self._compute_authoritative_kpis(tenant.id, now)

            return {
                "sales_today": sales or 0.0,
                "total_debt": debt or 0.0,
                "deliveries_today": deliveries or 0.0,
                "status": "reconciled" if sales is not None else "degraded",
            }
        except Exception as e:
            # 🛡️ Absolute Fail-Safe: If anything crashes (SQL, UUIDs, etc.), go to Truth
            logger.error(
                "dashboard.critical_service_failure_falling_back", error=str(e)
            )
            try:
                authoritative = self._compute_authoritative_kpis(tenant.id, now)
                authoritative["status"] = "authoritative_fallback"
                return authoritative
            except Exception as e2:
                logger.critical("dashboard.total_collapse", error=str(e2))
                return {
                    "sales_today": 0.0,
                    "total_debt": 0.0,
                    "deliveries_today": 0.0,
                    "status": "total_failure_clean_return",
                }

    def _compute_authoritative_kpis(
        self, tenant_id: UUID, day_start: datetime
    ) -> Dict[str, float]:
        """Private helper for authoritative truth recomputation."""
        day_end = day_start + timedelta(days=1)

        sales = (
            self.db.exec(
                select(func.sum(Payment.amount)).where(
                    Payment.tenant_id == tenant_id,
                    Payment.created_at >= day_start,
                    Payment.created_at < day_end,
                )
            ).first()
            or 0.0
        )

        debt = abs(
            float(
                self.db.exec(
                    select(func.sum(CustomerBalance.balance)).where(
                        CustomerBalance.tenant_id == tenant_id,
                        CustomerBalance.balance < 0,
                    )
                ).first()
                or 0.0
            )
        )

        deliveries = (
            self.db.exec(
                select(func.count(InventoryMovement.id)).where(
                    InventoryMovement.tenant_id == tenant_id,
                    InventoryMovement.type == "delivery",
                    InventoryMovement.created_at >= day_start,
                    InventoryMovement.created_at < day_end,
                )
            ).first()
            or 0
        )

        return {
            "sales_today": float(sales or 0.0),
            "total_debt": float(debt or 0.0),
            "deliveries_today": float(deliveries or 0.0),
        }
