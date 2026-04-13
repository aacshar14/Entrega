import stripe
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlmodel import Session
from app.core.db import get_session
from app.core.config import settings
from app.core.logging import logger
from app.services.stripe_service import StripeService

router = APIRouter()


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_session),
):
    """
    Main Stripe Webhook Handler.
    Handles payment success, subscription updates, and failures.
    """
    if not stripe_signature:
        logger.error("stripe.webhook_missing_signature")
        raise HTTPException(status_code=400, detail="Missing stripe-signature")

    payload = await request.body()
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError as e:
        logger.error("stripe.webhook_invalid_payload", error=str(e))
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error("stripe.webhook_invalid_signature", error=str(e))
        raise HTTPException(status_code=400, detail="Invalid signature")

    service = StripeService(db)

    # 1. Idempotency Check
    if service.is_event_processed(event.id):
        logger.info("stripe.webhook_duplicate_ignored", event_id=event.id)
        return {"status": "success", "detail": "event_already_processed"}

    # 2. Event Routing
    event_type = event.type
    data_object = event.data.object

    logger.info("stripe.webhook_received", event_type=event_type, event_id=event.id)

    try:
        if event_type == "checkout.session.completed":
            service.handle_checkout_completed(data_object)

        elif event_type == "customer.subscription.created":
            # Activation usually happens in checkout.session.completed for new subs
            pass

        elif event_type == "customer.subscription.updated":
            service.handle_subscription_updated(data_object)

        elif event_type == "customer.subscription.deleted":
            service.handle_subscription_deleted(data_object)

        elif event_type == "invoice.payment_failed":
            # data_object is an invoice
            sub_id = data_object.get("subscription")
            if sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                service.handle_subscription_updated(sub)

        # 3. Record Event for Idempotency
        service.record_event(event.id, event_type)

        return {"status": "success"}

    except Exception as e:
        logger.error(
            "stripe.webhook_processing_failed", event_id=event.id, error=str(e)
        )
        # Return 200 even on error to prevent Stripe from retrying too aggressively
        # unless it's a truly transient DB error.
        # But for PR-ready, we let it fail if it's unexpected so Stripe retries.
        raise HTTPException(status_code=500, detail="Internal processing error")
