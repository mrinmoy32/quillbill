"""Thin wrapper around the two Razorpay features we use. Docs: https://razorpay.com/docs/payments/subscriptions/

Kept as plain HTTP calls (no SDK) so you can see exactly what is sent.
"""
import hashlib
import hmac

import httpx

from app.core.errors import AppError
from app.settings import settings

API = "https://api.razorpay.com/v1"


def is_configured() -> bool:
    s = settings.secrets
    return bool(s.razorpay_key_id and s.razorpay_key_secret and settings.config.razorpay_pro_plan_id)


def create_subscription(business_id: str) -> dict:
    """Create a monthly Pro subscription. Returns {"id": ..., "short_url": ...}."""
    if not is_configured():
        raise AppError("Payments are not configured yet.", code="billing_not_configured")
    s = settings.secrets
    resp = httpx.post(
        f"{API}/subscriptions",
        auth=(s.razorpay_key_id, s.razorpay_key_secret),
        json={
            "plan_id": settings.config.razorpay_pro_plan_id,
            "total_count": 120,  # max billing cycles (10 years); customer can cancel anytime
            "customer_notify": 1,
            "notes": {"business_id": business_id},  # comes back in webhooks so we know whose it is
        },
        timeout=15,
    )
    if resp.status_code >= 400:
        raise AppError("Could not start checkout. Please try again.", code="billing_provider_error")
    return resp.json()


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    secret = settings.secrets.razorpay_webhook_secret
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
