from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select, text, func
from app.models.models import InboundEvent, MetricSnapshot, get_utc_now
from typing import List, Dict

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
            ("24h", timedelta(hours=24))
        ]
        
        metrics = [
            ("webhook_intake_ms", "webhook_duration_ms"),
            ("queue_wait_ms", "EXTRACT(EPOCH FROM (locked_at - created_at)) * 1000"),
            ("processing_ms", "EXTRACT(EPOCH FROM (processed_at - locked_at)) * 1000"),
            ("end_to_end_ms", "EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000")
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
                    period_end=now
                )
        
        # 2. Per-Tenant Pressure (24h)
        self._refresh_tenant_pressure(now - timedelta(hours=24), now)
        
        self.db.commit()

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
            self._save_metric(f"tenant_failures_24h", fail, period_start, period_end, t_id)
            self._save_metric(f"tenant_retries_24h", retries, period_start, period_end, t_id)
            self._save_metric(f"tenant_p95_processing_ms_24h", p95 or 0, period_start, period_end, t_id)
            self._save_metric(f"tenant_backlog_current", backlog, period_start, period_end, t_id)

    def _save_metric(self, name: str, value: float, start: datetime, end: datetime, tenant_id=None):
        snapshot = MetricSnapshot(
            metric_name=name,
            metric_value=float(value),
            period_start=start,
            period_end=end,
            created_at=end,
            tenant_id=tenant_id
        )
        self.db.add(snapshot)

    def _calculate_and_save(self, metric_name: str, sql_expression: str, period_start: datetime, period_end: datetime):
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

        result = self.db.execute(text(base_query), {"start": period_start, "end": period_end}).first()
        
        if not result or all(v is None for v in result):
            return

        percentiles = [("p90", result[0]), ("p95", result[1]), ("p99", result[2])]
        
        for p_label, val in percentiles:
            if val is None: continue
            
            # Upsert snapshot
            full_name = f"{metric_name}_{p_label}"
            
            # Simple upsert logic: delete old ones for this specific name and window?
            # Or just append. The dashboard usually wants the 'latest' snapshot.
            snapshot = MetricSnapshot(
                metric_name=full_name,
                metric_value=float(val),
                period_start=period_start,
                period_end=period_end,
                created_at=period_end
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
            .limit(100) # Get enough for all combinations
        ).all()
        
        # Organize by name
        data = {}
        for s in snapshots:
            if s.metric_name not in data:
                data[s.metric_name] = s.metric_value
                
        return data
