from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.models.models import Tenant, BillingInfo, BillingEntitlements
from uuid import UUID

class BillingResolver:
    """
    STRICT DETERMINISTIC RESOLVER (V2.5.0).
    The single source of truth for computing tenant entitlements.
    """

    @staticmethod
    def resolve_billing(tenant: Tenant) -> BillingInfo:
        now = datetime.now(timezone.utc)
        
        # 1. Base Strategy: Inheritance from model
        status = tenant.billing_status or "inactive"
        plan = tenant.plan_code or "basic_monthly"
        effective_status = status
        
        # 2. State Machine Overrides (Deterministic)
        # Priority 1: Explicit Manual Block
        if tenant.is_blocked:
            effective_status = "suspended"
        
        # Priority 2: Expiry Logic
        else:
            if tenant.subscription_ends_at and now < tenant.subscription_ends_at.replace(tzinfo=timezone.utc):
                effective_status = "active_paid"
            elif tenant.trial_ends_at and now < tenant.trial_ends_at.replace(tzinfo=timezone.utc):
                effective_status = "trial_active"
            elif tenant.grace_ends_at and now < tenant.grace_ends_at.replace(tzinfo=timezone.utc):
                effective_status = "grace"
            else:
                effective_status = "suspended"

        # 3. Calculate Entitlements based on Effective Status
        entitlements = BillingEntitlements(
            can_access_dashboard=effective_status in ["active_paid", "trial_active", "grace"],
            can_process_whatsapp=effective_status in ["active_paid", "trial_active", "grace"],
            can_create_orders=effective_status in ["active_paid", "trial_active", "grace"],
            can_export=effective_status in ["active_paid"], # Only paid users can export
            show_paywall=effective_status in ["grace", "suspended"]
        )

        # 4. Calculate Days Remaining
        days_remaining = None
        target_date = None
        if effective_status == "active_paid":
            target_date = tenant.subscription_ends_at
        elif effective_status == "trial_active":
            target_date = tenant.trial_ends_at
        elif effective_status == "grace":
            target_date = tenant.grace_ends_at

        if target_date:
            delta = target_date.replace(tzinfo=timezone.utc) - now
            days_remaining = max(0, delta.days)

        return BillingInfo(
            billing_status=status,
            effective_status=effective_status,
            plan_code=plan,
            trial_ends_at=tenant.trial_ends_at,
            subscription_ends_at=tenant.subscription_ends_at,
            grace_ends_at=tenant.grace_ends_at,
            is_blocked=tenant.is_blocked,
            block_reason=tenant.block_reason,
            entitlements=entitlements,
            days_remaining=days_remaining
        )
