import stripe
from sqlmodel import Session, select
from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings
from app.core.logging import logger
from app.models.models import Tenant, StripeEvent

# Plan Mapping Logic (Source of Truth)
# Lookup Keys should be configured in Stripe to match these exactly
PLAN_MAPPING = {
    "basic_monthly": "basic_monthly",
    "premium_early_40_monthly": "premium_early_40_monthly",
    "premium_founding_30_monthly": "premium_founding_30_monthly",
    "premium_monthly": "premium_monthly",
}


class StripeService:
    def __init__(self, db: Session):
        self.db = db
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def resolve_plan_code(self, price_id: str) -> str:
        """
        Resolves internal plan_code from Stripe Price ID or Lookup Key.
        Uses lookup_key as primary identifier if available.
        """
        try:
            # 1. Check if price_id is already a plan_code (internal safe path)
            if price_id in PLAN_MAPPING.values():
                return price_id

            price = stripe.Price.retrieve(price_id)
            lookup_key = price.get("lookup_key")

            if lookup_key and lookup_key in PLAN_MAPPING:
                return PLAN_MAPPING[lookup_key]

            # Final attempt: Check metadata on the price object if lookup_key missing
            plan_code_meta = price.get("metadata", {}).get("plan_code")
            if plan_code_meta and plan_code_meta in PLAN_MAPPING:
                return plan_code_meta

            logger.warning(
                "stripe.plan_resolution_failed",
                stripe_price_id=price_id,
                lookup_key=lookup_key,
            )
            return "basic_monthly"  # Fail safe to basic
        except Exception as e:
            logger.error(
                "stripe.price_retrieval_failed", error=str(e), price_id=price_id
            )
            return "basic_monthly"

    def create_checkout_session(
        self, tenant_id: str, plan_code: str, success_url: str, cancel_url: str
    ):
        """
        Generates a deterministic Stripe Checkout Session for a specific tenant.
        """
        # 1. Find price by lookup key
        prices = stripe.Price.list(lookup_keys=[plan_code], active=True, limit=1)
        if not prices.data:
            logger.error("stripe.checkout_failed_price_not_found", plan_code=plan_code)
            raise ValueError(f"Plan {plan_code} not found in Stripe")

        price_id = prices.data[0].id

        # 2. Find or Create Customer
        tenant = self.db.get(Tenant, tenant_id)
        customer_id = tenant.stripe_customer_id

        session = stripe.checkout.Session.create(
            customer=customer_id,  # Optional, if None Stripe creates one
            client_reference_id=str(tenant.id),
            metadata={"tenant_id": str(tenant.id), "plan_code": plan_code},
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            subscription_data={"metadata": {"tenant_id": str(tenant.id)}},
        )
        return session

    def handle_checkout_completed(self, session: stripe.checkout.Session):
        """
        Main activation logic for checkout.session.completed.
        """
        tenant_id_str = session.get("client_reference_id") or session.get(
            "metadata", {}
        ).get("tenant_id")
        customer_email = session.get("customer_details", {}).get("email")

        stripe_customer_id = session.get("customer")
        stripe_subscription_id = session.get("subscription")

        # 1. Resolve Tenant
        tenant = None
        if tenant_id_str:
            try:
                tenant = self.db.get(Tenant, tenant_id_str)
            except Exception:
                pass

        if not tenant and customer_email:
            # Fallback to email lookup if unique membership exists
            # (Requires complex join, we prefer metadata/client_ref)
            from app.models.models import User, TenantUser

            user = self.db.exec(
                select(User).where(User.email == customer_email)
            ).first()
            if user:
                # Get the first active membership
                membership = self.db.exec(
                    select(TenantUser)
                    .where(TenantUser.user_id == user.id)
                    .where(TenantUser.is_active == True)
                ).first()
                if membership:
                    tenant = self.db.get(Tenant, membership.tenant_id)

        if not tenant:
            logger.error(
                "stripe.tenant_resolve_failed",
                session_id=session.id,
                email=customer_email,
            )
            return False

        # 2. Get Subscription Details
        subscription = stripe.Subscription.retrieve(stripe_subscription_id)
        price_id = subscription["items"]["data"][0]["price"]["id"]
        plan_code = self.resolve_plan_code(price_id)

        # 3. Update Tenant Billing State & Cleanup Upgrades
        old_sub_id = tenant.stripe_subscription_id
        if old_sub_id and old_sub_id != stripe_subscription_id:
            try:
                # Cleanup: If they had an active sub, cancel it to prevent doubles
                # This handles 'Upgrade/Downgrade via new Checkout' gracefully
                stripe.Subscription.delete(old_sub_id)
                logger.info(
                    "stripe.upgrade_cleanup_success",
                    tenant_id=str(tenant.id),
                    old_sub=old_sub_id,
                )
            except Exception as e:
                logger.warning(
                    "stripe.upgrade_cleanup_failed",
                    tenant_id=str(tenant.id),
                    error=str(e),
                )

        tenant.stripe_customer_id = stripe_customer_id
        tenant.stripe_subscription_id = stripe_subscription_id
        tenant.stripe_price_id = price_id
        tenant.plan_code = plan_code
        tenant.billing_status = "active"
        tenant.subscription_ends_at = datetime.fromtimestamp(
            subscription.current_period_end, tz=timezone.utc
        )
        tenant.billing_updated_at = datetime.now(timezone.utc)

        self.db.add(tenant)
        self.db.commit()

        # 4. Trigger Demo Seeding (Phase 6 Demo Flow)
        if session.get("metadata", {}).get("demo") == "true":
            try:
                from app.services.demo_service import DemoService

                demo = DemoService(self.db)
                demo.seed_aguachiles_demo(tenant.id)
            except Exception as e:
                logger.error(
                    "demo.seeding_failed", tenant_id=str(tenant.id), error=str(e)
                )

        logger.info(
            "stripe.tenant_activated",
            tenant_id=str(tenant.id),
            plan=plan_code,
            sub_id=stripe_subscription_id,
        )
        return True

    def handle_subscription_updated(self, subscription: stripe.Subscription):
        """
        Updates billing status and period ends based on subscription lifecycle.
        """
        tenant = self.db.exec(
            select(Tenant).where(Tenant.stripe_subscription_id == subscription.id)
        ).first()

        if not tenant:
            logger.warning(
                "stripe.sub_update_ignored_no_tenant", sub_id=subscription.id
            )
            return

        status_map = {
            "active": "active",
            "past_due": "past_due",
            "unpaid": "canceled",
            "canceled": "canceled",
            "incomplete": "inactive",
            "incomplete_expired": "canceled",
            "trialing": "active",
        }

        tenant.billing_status = status_map.get(subscription.status, "canceled")
        tenant.subscription_ends_at = datetime.fromtimestamp(
            subscription.current_period_end, tz=timezone.utc
        )
        tenant.last_payment_status = subscription.status

        self.db.add(tenant)
        self.db.commit()
        logger.info(
            "stripe.subscription_updated",
            tenant_id=str(tenant.id),
            status=subscription.status,
        )

    def handle_subscription_deleted(self, subscription: stripe.Subscription):
        """
        Handles subscription cancellation.
        """
        tenant = self.db.exec(
            select(Tenant).where(Tenant.stripe_subscription_id == subscription.id)
        ).first()

        if tenant:
            tenant.billing_status = "canceled"
            tenant.billing_notes = f"Subscription {subscription.id} deleted."
            self.db.add(tenant)
            self.db.commit()
            logger.info("stripe.subscription_deleted", tenant_id=str(tenant.id))

    def is_event_processed(self, event_id: str) -> bool:
        """
        Idempotency check.
        """
        existing = self.db.exec(
            select(StripeEvent).where(StripeEvent.stripe_event_id == event_id)
        ).first()
        return existing is not None

    def record_event(
        self, event_id: str, event_type: str, tenant_id: Optional[str] = None
    ):
        """
        Records the event to prevent re-processing.
        """
        new_event = StripeEvent(
            stripe_event_id=event_id, event_type=event_type, tenant_id=tenant_id
        )
        self.db.add(new_event)
        self.db.commit()
