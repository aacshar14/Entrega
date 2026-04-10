from pydantic import BaseModel


class PlatformThresholds(BaseModel):
    # Tenant Pressure
    HOT_TENANT_VOLUME_24H: int = 5000
    HOT_TENANT_FAILURES_24H: int = 50
    WARNING_TENANT_VOLUME_24H: int = 1000

    # Infrastructure Health
    BACKLOG_WARNING_THRESHOLD: int = 500
    BACKLOG_CRITICAL_THRESHOLD: int = 2000

    # Latency (ms)
    P95_LATENCY_MAX_THRESHOLD: int = 5000  # 5 seconds

    # Capacity Advisor
    CAPACITY_ADVISOR_BURST_RATIO: float = 1.5


# Global Instance
PLATFORM_THRESHOLDS = PlatformThresholds()
