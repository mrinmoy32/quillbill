import hashlib
import hmac
import json

from tests.conftest import auth


def test_billing_status_defaults_to_free(client):
    s = client.get("/api/v1/billing", headers=auth()).json()
    assert s["plan"] == "free" and s["invoices_limit"] == 3


def test_webhook_rejects_bad_signature(client):
    r = client.post("/api/v1/billing/webhook", content=b"{}", headers={"X-Razorpay-Signature": "nope"})
    assert r.status_code == 401


def test_webhook_upgrades_to_pro(client, monkeypatch):
    from app.settings import get_settings

    monkeypatch.setattr(get_settings().secrets, "razorpay_webhook_secret", "whsec_test")
    me = client.get("/api/v1/me", headers=auth()).json()  # creates the business
    payload = {"event": "subscription.activated", "payload": {"subscription": {"entity": {"id": "sub_1", "current_end": 4102444800, "notes": {"business_id": me["business"]["id"]}}}}}
    raw = json.dumps(payload).encode()
    sig = hmac.new(b"whsec_test", raw, hashlib.sha256).hexdigest()
    assert client.post("/api/v1/billing/webhook", content=raw, headers={"X-Razorpay-Signature": sig}).status_code == 200
    s = client.get("/api/v1/billing", headers=auth()).json()
    assert s["plan"] == "pro" and s["invoices_limit"] is None
