import json

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import Tenant, get_tenant
from app.core.errors import Unauthorized
from app.integrations import razorpay
from app.modules.billing import service
from app.modules.billing.schemas import BillingStatus, CheckoutOut

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("", response_model=BillingStatus)
def billing_status(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return service.get_status(db, tenant.business)


@router.post("/checkout", response_model=CheckoutOut)
def checkout(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    """Returns a Razorpay-hosted payment page URL; the browser redirects there."""
    return CheckoutOut(checkout_url=service.start_checkout(db, tenant.business))


@router.post("/webhook", include_in_schema=False)
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(default=""), db: Session = Depends(get_db)):
    """Called by Razorpay, not by our frontend. No login; protected by the signature instead."""
    raw = await request.body()
    if not razorpay.verify_webhook_signature(raw, x_razorpay_signature):
        raise Unauthorized("Invalid webhook signature.")
    service.apply_webhook_event(db, json.loads(raw))
    return {"ok": True}
