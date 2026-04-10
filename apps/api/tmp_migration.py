import sys
from sqlmodel import Session, create_engine, text

DATABASE_URL = "postgresql://postgres.dynpljsdgpebrzvhmzlj:uScenOWklzKwOgyn@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

migration_sql = """
-- 1. Inbound Events Queue
CREATE TABLE IF NOT EXISTS inbound_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    source TEXT NOT NULL DEFAULT 'whatsapp',
    event_type TEXT NOT NULL DEFAULT 'message',
    message_sid TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    last_error TEXT
);

-- Indices for performance (FOR UPDATE SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_inbound_events_processing 
ON inbound_events(status, available_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_inbound_events_message_sid 
ON inbound_events(message_sid);

CREATE INDEX IF NOT EXISTS idx_inbound_events_tenant_id 
ON inbound_events(tenant_id);

-- 2. Metric Snapshots for Rollups
CREATE TABLE IF NOT EXISTS metric_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    metric_name TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_lookup 
ON metric_snapshots(metric_name, created_at);
"""


def apply():
    engine = create_engine(DATABASE_URL)
    with Session(engine) as session:
        print("Applying migration...")
        session.execute(text(migration_sql))
        session.commit()
    print("Migration applied successfully.")


if __name__ == "__main__":
    apply()
