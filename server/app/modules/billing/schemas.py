from datetime import datetime

from pydantic import BaseModel


class BillingStatus(BaseModel):
    plan: str  # "free" | "pro" (the plan the customer gets *right now*)
    status: str
    invoices_used_this_month: int
    invoices_limit: int | None  # None = unlimited
    current_period_end: datetime | None
    checkout_available: bool  # False until Razorpay keys + plan id are configured


class CheckoutOut(BaseModel):
    checkout_url: str
