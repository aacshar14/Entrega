from uuid import UUID
from datetime import datetime, timezone
from sqlmodel import Session, select, func
from app.models.models import BusinessMetricEvent, Payment


def get_tenant_metrics(db: Session, tenant_id: UUID):
    """
    Calculates operational KPIs strictly scoped to the tenant for the current day.
    """
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # 1. Ventas de Hoy (Total sum of payments created today)
    sales = (
        db.exec(
            select(func.sum(Payment.amount)).where(
                Payment.tenant_id == tenant_id, Payment.created_at >= today_start
            )
        ).one()
        or 0.0
    )

    # 2. Errores de Stock Hoy (Telemetry events)
    stock_errors = (
        db.exec(
            select(func.count(BusinessMetricEvent.id)).where(
                BusinessMetricEvent.tenant_id == tenant_id,
                BusinessMetricEvent.event_type == "stock_insufficient",
                BusinessMetricEvent.created_at >= today_start,
            )
        ).one()
        or 0
    )

    # 3. Intentos Fallidos Hoy (Telemetry events)
    failed_attempts = (
        db.exec(
            select(func.count(BusinessMetricEvent.id)).where(
                BusinessMetricEvent.tenant_id == tenant_id,
                BusinessMetricEvent.event_type == "processing_failed",
                BusinessMetricEvent.created_at >= today_start,
            )
        ).one()
        or 0
    )

    return {
        "sales_today": float(sales),
        "stock_errors_today": int(stock_errors),
        "failed_attempts_today": int(failed_attempts),
    }
