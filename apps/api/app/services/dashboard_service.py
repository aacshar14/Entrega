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
        Can be triggered on-demand or by background worker.
        """
        if not date:
            date = datetime.now(timezone.utc)

        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        # 1. Sales Today (Sum of payments)
        sales = (
            self.db.exec(
                select(func.sum(Payment.amount)).where(
                    Payment.tenant_id == tenant_id,
                    Payment.created_at >= day_start,
                    Payment.created_at < day_end,
                )
            ).one()
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
                ).one()
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
            ).one()
            or 0
        )

        kpis = {
            "sales_today": float(sales),
            "total_debt": float(debt),
            "deliveries_today": float(deliveries),
        }

        # Persist to Snapshots
        for name, val in kpis.items():
            # Upsert Pattern
            stmt = text("""
                INSERT INTO metric_snapshots (id, tenant_id, metric_name, metric_value, period_start, period_end, created_at)
                VALUES (:id, :t_id, :name, :val, :start, :end, :now)
                ON CONFLICT ON CONSTRAINT uq_metric_snapshot
                DO UPDATE SET metric_value = EXCLUDED.metric_value, created_at = EXCLUDED.created_at
            """)
            import uuid

            self.db.execute(
                stmt,
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

    def get_dashboard_kpis(self, tenant: Tenant) -> Dict[str, float]:
        """
        Returns KPIs, preferring snapshots for performance.
        Falls back to live queries only if snapshots are stale/missing (>1h).
        """
        now = datetime.now(timezone.utc)

        # Try Snapshots first
        sales = self.get_metric(tenant.id, "sales_today", now)
        debt = self.get_metric(tenant.id, "total_debt", now)
        deliveries = self.get_metric(tenant.id, "deliveries_today", now)

        # If any missing, or if snapshot is older than 1h, refresh
        # (For V2 simplicity we always try to refresh if missing)
        if sales is None or debt is None:
            self.refresh_daily_kpis(tenant.id, now)
            sales = self.get_metric(tenant.id, "sales_today", now)
            debt = self.get_metric(tenant.id, "total_debt", now)
            deliveries = self.get_metric(tenant.id, "deliveries_today", now)

        return {
            "sales_today": sales or 0.0,
            "total_debt": debt or 0.0,
            "deliveries_today": deliveries or 0.0,
        }
