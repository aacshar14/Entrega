from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select, text, func
from app.models.models import InboundEvent, MetricSnapshot, PlatformAlert, get_utc_now
from app.core.thresholds import PLATFORM_THRESHOLDS
from typing import List, Dict, Optional
import structlog
import uuid

logger = structlog.get_logger()


class MetricsAggregator:
    def __init__(self, db: Session):
        self.db = db

    def refresh_all_snapshots(self):
        """
        Calculates percentiles for 5m, 1h, and 24h windows and stores them in MetricSnapshot.
        """
        windows = [
            ("5m", timedelta(minutes=5)),
            ("1h", timedelta(hours=1)),
            ("24h", timedelta(hours=24)),
        ]

        metrics = [
            ("webhook_intake_ms", "webhook_duration_ms"),
            ("queue_wait_ms", "EXTRACT(EPOCH FROM (locked_at - created_at)) * 1000"),
            ("processing_ms", "EXTRACT(EPOCH FROM (processed_at - locked_at)) * 1000"),
            ("end_to_end_ms", "EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000"),
        ]

        now = get_utc_now()

        # 1. Global Metrics
        for window_label, delta in windows:
            period_start = now - delta

            for metric_name, sql_expression in metrics:
                self._calculate_and_save(
                    metric_name=f"{window_label}_{metric_name}",
                    sql_expression=sql_expression,
                    period_start=period_start,
                    period_end=now,
                )

        # 2. Per-Tenant Pressure (24h)
        self._refresh_tenant_pressure(now - timedelta(hours=24), now)

        # 3. Snapshot Hygiene: Retention policy (e.g. 30 days)
        self._cleanup_old_snapshots(now - timedelta(days=30))

        # 4. Autonomous Operations: Alert Evaluation
        self._evaluate_alerts(now)

        self.db.commit()

    def _cleanup_old_snapshots(self, cutoff: datetime):
        """
        Delete snapshots older than the retention period to prevent storage bloat.
        """
        query = text("DELETE FROM metric_snapshots WHERE created_at < :cutoff")
        self.db.execute(query, {"cutoff": cutoff})

    def _evaluate_alerts(self, now: datetime):
        """
        Scan latest snapshots and create alerts if thresholds are exceeded.
        """

        # Resolve latest snapshots for key metrics
        def get_stat(name, tenant_id=None):
            stmt = select(MetricSnapshot.metric_value).where(
                MetricSnapshot.metric_name == name
            )
            if tenant_id:
                stmt = stmt.where(MetricSnapshot.tenant_id == tenant_id)
            return self.db.exec(stmt.order_by(MetricSnapshot.created_at.desc())).first()

        # 1. Backlog Alert
        backlog = self.db.exec(
            select(func.count(InboundEvent.id)).where(InboundEvent.status == "pending")
        ).one()
        if backlog > PLATFORM_THRESHOLDS.BACKLOG_WARNING_THRESHOLD:
            severity = (
                "critical"
                if backlog > PLATFORM_THRESHOLDS.BACKLOG_CRITICAL_THRESHOLD
                else "warning"
            )
            self._trigger_alert(
                type="backlog",
                severity=severity,
                message=f"Queue backlog is high: {backlog} messages pending.",
                metric_value=float(backlog),
                recommended_action="Scalability: Review active workers or increase processing concurrency.",
            )

        # 2. Latency Alert (p95)
        p95_latency = get_stat("1h_end_to_end_ms_p95")
        if p95_latency and p95_latency > PLATFORM_THRESHOLDS.P95_LATENCY_MAX_THRESHOLD:
            self._trigger_alert(
                type="latency",
                severity="critical",
                message=f"System latency p95 is exceeding SLA: {round(p95_latency, 2)}ms.",
                metric_value=p95_latency,
                snapshot_reference="1h_end_to_end_ms_p95",
                recommended_action="Optimization: Investigate database contention or worker execution timeouts.",
            )

        # 3. Hot Tenants Alert
        hot_tenant_snaps = self.db.exec(
            select(MetricSnapshot)
            .where(MetricSnapshot.metric_name == "tenant_volume_24h")
            .where(
                MetricSnapshot.metric_value
                > PLATFORM_THRESHOLDS.WARNING_TENANT_VOLUME_24H
            )
            .order_by(MetricSnapshot.created_at.desc())
            .limit(10)
        ).all()

        for hts in hot_tenant_snaps:
            if hts.metric_value > PLATFORM_THRESHOLDS.HOT_TENANT_VOLUME_24H:
                self._trigger_alert(
                    type="tenant_pressure",
                    severity="critical",
                    tenant_id=hts.tenant_id,
                    message=f"Hot Tenant Detected: High volume ({int(hts.metric_value)} events/24h).",
                    metric_value=hts.metric_value,
                    recommended_action="Governance: Evaluate throttling or move to dedicated worker tier.",
                )

    def _trigger_alert(
        self,
        type: str,
        severity: str,
        message: str,
        metric_value: float,
        recommended_action: str,
        tenant_id: Optional[uuid.UUID] = None,
        snapshot_reference: Optional[str] = None,
    ):
        """
        Persists a platform alert and logs it.
        """
        # Close old alerts of same type/tenant if they exist?
        # For simplicity in v1, we mark old active ones as inactive
        self.db.execute(
            text(
                "UPDATE platform_alerts SET is_active = FALSE, resolved_at = :now WHERE type = :type AND tenant_id IS NOT DISTINCT FROM :tenant_id AND is_active = TRUE"
            ),
            {"now": get_utc_now(), "type": type, "tenant_id": tenant_id},
        )

        alert = PlatformAlert(
            type=type,
            severity=severity,
            tenant_id=tenant_id,
            message=message,
            recommended_action=recommended_action,
            metric_value=metric_value,
            snapshot_reference=snapshot_reference,
        )
        self.db.add(alert)
        logger.warning(
            "platform.alert_triggered", type=type, severity=severity, message=message
        )

    def _refresh_tenant_pressure(self, period_start: datetime, period_end: datetime):
        """
        Calculate Top Tenants by volume, failures, and p95 for the pressure panel.
        """
        query = text("""
            SELECT 
                tenant_id,
                COUNT(*) as volume,
                COUNT(*) FILTER (WHERE status = 'failed') as failures,
                SUM(attempt_count) as total_retries,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - locked_at)) * 1000) as p95_ms,
                COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as backlog
            FROM inbound_events
            WHERE created_at >= :start
            GROUP BY tenant_id
            ORDER BY volume DESC
            LIMIT 20
        """)

        results = self.db.execute(query, {"start": period_start}).all()

        for row in results:
            t_id, vol, fail, retries, p95, backlog = row

            # Store specialized snapshots for this tenant
            self._save_metric(f"tenant_volume_24h", vol, period_start, period_end, t_id)
            self._save_metric(
                f"tenant_failures_24h", fail, period_start, period_end, t_id
            )
            self._save_metric(
                f"tenant_retries_24h", retries, period_start, period_end, t_id
            )
            self._save_metric(
                f"tenant_p95_processing_ms_24h",
                p95 or 0,
                period_start,
                period_end,
                t_id,
            )
            self._save_metric(
                f"tenant_backlog_current", backlog, period_start, period_end, t_id
            )

    def _save_metric(
        self, name: str, value: float, start: datetime, end: datetime, tenant_id=None
    ):
        snapshot = MetricSnapshot(
            metric_name=name,
            metric_value=float(value),
            period_start=start,
            period_end=end,
            created_at=end,
            tenant_id=tenant_id,
        )
        self.db.add(snapshot)

    def _calculate_and_save(
        self,
        metric_name: str,
        sql_expression: str,
        period_start: datetime,
        period_end: datetime,
    ):
        """
        Computes p90, p95, p99 and saves as individual snapshots.
        """
        # We need to filter by status='done' and the period
        # For webhook_intake_ms, we can include any event that has it, regardless of status?
        # But per requirements "end_to_end" needs it to be 'done'.

        base_query = f"""
            SELECT 
                PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY {sql_expression}) as p90,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY {sql_expression}) as p95,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY {sql_expression}) as p99
            FROM inbound_events
            WHERE status = 'done'
              AND processed_at >= :start
              AND processed_at <= :end
        """

        result = self.db.execute(
            text(base_query), {"start": period_start, "end": period_end}
        ).first()

        if not result or all(v is None for v in result):
            return

        percentiles = [("p90", result[0]), ("p95", result[1]), ("p99", result[2])]

        for p_label, val in percentiles:
            if val is None:
                continue

            # Upsert snapshot
            full_name = f"{metric_name}_{p_label}"

            # Simple upsert logic: delete old ones for this specific name and window?
            # Or just append. The dashboard usually wants the 'latest' snapshot.
            snapshot = MetricSnapshot(
                metric_name=full_name,
                metric_value=float(val),
                period_start=period_start,
                period_end=period_end,
                created_at=period_end,
            )
            self.db.add(snapshot)

    def get_latest_metrics(self) -> Dict:
        """
        Retrieves the most recent snapshots for all metrics.
        """
        # Standardize returns to match what UI expects
        snapshots = self.db.exec(
            select(MetricSnapshot)
            .order_by(MetricSnapshot.created_at.desc())
            .limit(100)  # Get enough for all combinations
        ).all()

        # Organize by name
        data = {}
        for s in snapshots:
            if s.metric_name not in data:
                data[s.metric_name] = s.metric_value

        return data
