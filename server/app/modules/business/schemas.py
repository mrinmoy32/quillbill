from decimal import Decimal
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class BusinessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str | None
    phone: str | None
    address: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    country: str
    tax_id: str | None
    tax_label: str
    logo_url: str | None
    currency: str
    locale: str
    invoice_prefix: str
    next_invoice_number: int
    default_tax_percent: float
    default_due_days: int
    payment_details: str | None
    default_notes: str | None


class BusinessUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str = Field(default="IN", min_length=2, max_length=2)
    tax_id: str | None = Field(default=None, max_length=50)
    tax_label: str = Field(default="GST", max_length=20)
    logo_url: str | None = Field(default=None, max_length=500)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    locale: str = Field(default="en_IN", max_length=10)
    invoice_prefix: str = Field(default="INV", min_length=1, max_length=10, pattern=r"^[A-Za-z0-9\-]+$")
    default_tax_percent: float = Field(default=18, ge=0, le=100)
    default_due_days: int = Field(default=15, ge=0, le=365)
    payment_details: str | None = None
    default_notes: str | None = None
