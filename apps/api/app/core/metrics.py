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

        for window_label, delta in windows:
            period_start = now - delta
            
            for metric_name, sql_expression in metrics:
                self._calculate_and_save(
                    metric_name=f"{window_label}_{metric_name}",
                    sql_expression=sql_expression,
                    period_start=period_start,
                    period_end=now
                )
        
        self.db.commit()

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
