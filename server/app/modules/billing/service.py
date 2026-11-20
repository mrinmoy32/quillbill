"""Plans and limits. Business rules live here, not in routers.

Plans:
  free -> N invoices per calendar month (config: free_plan_monthly_invoice_limit)
  pro  -> unlimited, no "Created with ..." footer on PDFs
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import NotFound, PlanLimitReached
from app.integrations import razorpay
from app.modules.billing.models import Subscription
from app.modules.billing.schemas import BillingStatus
from app.modules.business.models import Business
from app.modules.invoices.models import Invoice
from app.settings import settings

# Razorpay events that mean "customer has paid / is active" and "customer no longer pays"
ACTIVE_EVENTS = {"subscription.activated", "subscription.charged", "subscription.resumed"}
ENDED_EVENTS = {"subscription.halted", "subscription.completed", "subscription.expired"}


def get_subscription(db: Session, business_id) -> Subscription:
    sub = db.scalar(select(Subscription).where(Subscription.business_id == business_id))
    if not sub:  # safety net; normally created at sign-up
        sub = Subscription(business_id=business_id, plan="free", status="active")
        db.add(sub)
        db.flush()
    return sub


def effective_plan(sub: Subscription) -> str:
    """Pro while paid. A cancelled customer keeps Pro until the period they paid for ends."""
    if sub.plan != "pro":
        return "free"
    if sub.status == "active":
        return "pro"
    if sub.status == "cancelled" and sub.current_period_end and sub.current_period_end > datetime.now(timezone.utc):
        return "pro"
    return "free"


def invoices_this_month(db: Session, business_id) -> int:
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return db.scalar(select(func.count()).select_from(Invoice).where(Invoice.business_id == business_id, Invoice.created_at >= start)) or 0


def get_status(db: Session, business: Business) -> BillingStatus:
    sub = get_subscription(db, business.id)
    plan = effective_plan(sub)
    return BillingStatus(
        plan=plan,
        status=sub.status,
        invoices_used_this_month=invoices_this_month(db, business.id),
        invoices_limit=None if plan == "pro" else settings.config.free_plan_monthly_invoice_limit,
        current_period_end=sub.current_period_end,
        checkout_available=razorpay.is_configured(),
    )


def assert_can_create_invoice(db: Session, business: Business) -> None:
    status = get_status(db, business)
    if status.invoices_limit is not None and status.invoices_used_this_month >= status.invoices_limit:
        raise PlanLimitReached(
            f"You've used all {status.invoices_limit} free invoices this month. Upgrade to Pro for unlimited invoices.",
            code="plan_limit_reached",
        )


def show_branding_footer(db: Session, business_id) -> bool:
    """Free plan PDFs carry a small 'Created with <product>' footer (our growth loop)."""
    return effective_plan(get_subscription(db, business_id)) != "pro"


def start_checkout(db: Session, business: Business) -> str:
    sub = razorpay.create_subscription(str(business.id))
    record = get_subscription(db, business.id)
    record.razorpay_subscription_id = sub["id"]
    db.flush()
    return sub["short_url"]


def apply_webhook_event(db: Session, payload: dict) -> None:
    """Update our records from a verified Razorpay webhook. Safe to run twice (idempotent)."""
    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("subscription", {}).get("entity")
    if not entity:
        return  # not a subscription event; ignore

    sub = db.scalar(select(Subscription).where(Subscription.razorpay_subscription_id == entity["id"]))
    if not sub:
        business_id = (entity.get("notes") or {}).get("business_id")
        sub = db.scalar(select(Subscription).where(Subscription.business_id == uuid.UUID(business_id))) if business_id else None
    if not sub:
        raise NotFound("Subscription not found for webhook.")

    sub.razorpay_subscription_id = entity["id"]
    if entity.get("current_end"):
        sub.current_period_end = datetime.fromtimestamp(entity["current_end"], tz=timezone.utc)

    if event in ACTIVE_EVENTS:
        sub.plan, sub.status = "pro", "active"
    elif event == "subscription.cancelled":
        sub.status = "cancelled"  # stays Pro until current_period_end (see effective_plan)
    elif event in ENDED_EVENTS:
        sub.plan, sub.status = "free", event.split(".")[1]
    db.flush()
