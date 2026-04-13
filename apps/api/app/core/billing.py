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
        """
        PRECEDENCE RULES (V2.5.1):
        1. is_blocked == True           => suspended (Access Denied)
        2. status == "active_paid"      => active_paid (Access Granted)
           Note: Access is granted even if subscription_ends_at is NULL.
           However, if subscription_ends_at is EXPLICIT and in the past, status is OVERRIDDEN to suspended.
        3. now < trial_ends_at          => trial_active (Access Granted)
        4. now < grace_ends_at          => grace (Access Granted)
        5. Default                      => suspended (Access Denied)
        """
        now = datetime.now(timezone.utc)
        
        # 1. Base Strategy
        status = tenant.billing_status or "inactive"
        plan = tenant.plan_code or "basic_monthly"
        effective_status = status
        
        # 2. State Machine Overrides (Deterministic)
        # Priority 1: Explicit Manual Block
        if tenant.is_blocked:
            effective_status = "suspended"
        
        # Priority 2: Multi-Layer Access Resolution (V3.3.0 Hardened)
        else:
            # Layer A: Check for VALID subscription (Active status with no expiry or future expiry)
            # We trust active_paid as primary, but ONLY if not strictly expired
            sub_end = tenant.subscription_ends_at.replace(tzinfo=timezone.utc) if tenant.subscription_ends_at else None
            trial_end = tenant.trial_ends_at.replace(tzinfo=timezone.utc) if tenant.trial_ends_at else None
            grace_end = tenant.grace_ends_at.replace(tzinfo=timezone.utc) if tenant.grace_ends_at else None

            if status == "active_paid" and (not sub_end or now < sub_end):
                effective_status = "active_paid"
            elif sub_end and now < sub_end:
                effective_status = "active_paid"
            
            # Layer B: RESCUE PATH (Trial Extension)
            elif trial_end and now < trial_end:
                effective_status = "trial_active"
            
            # Layer C: RESCUE PATH (Grace Period)
            elif grace_end and now < grace_end:
                effective_status = "grace"
                
            # Layer D: EXHAUSTED (Suspended)
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
