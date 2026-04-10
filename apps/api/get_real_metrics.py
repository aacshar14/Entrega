from app.core.db import engine
from sqlalchemy import text
import json


def get_metrics():
    with engine.connect() as conn:
        # 1. Basic Counts
        counts = conn.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'done') as done,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM inbound_events
        """)).fetchone()

        # 2. Latencies (Processing)
        latencies = conn.execute(text("""
            SELECT 
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p50,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p95,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p99
            FROM inbound_events
            WHERE status = 'done' AND processed_at > NOW() - INTERVAL '1 hour'
        """)).fetchone()

        # 3. Oldest pending
        oldest = conn.execute(text("""
            SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) 
            FROM inbound_events 
            WHERE status = 'pending' 
            ORDER BY created_at ASC LIMIT 1
        """)).scalar()

        metrics = {
            "counts": {
                "total": counts[0],
                "done": counts[1],
                "pending": counts[2],
                "failed": counts[3],
            },
            "processing_latency": {
                "p50": round(latencies[0] or 0, 3),
                "p95": round(latencies[1] or 0, 3),
                "p99": round(latencies[2] or 0, 3),
            },
            "oldest_pending_age_sec": round(oldest or 0, 3),
        }
        print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    get_metrics()
