import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.modules.business.schemas import BusinessOut
from app.modules.clients.schemas import ClientOut

InvoiceStatus = Literal["draft", "sent", "paid", "cancelled"]


class ItemIn(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    quantity: Decimal = Field(gt=0, le=1_000_000)
    unit_price_minor: int = Field(ge=0, le=10_000_000_000)
    tax_percent: Decimal = Field(default=Decimal(0), ge=0, le=100)


class InvoiceIn(BaseModel):
    client_id: uuid.UUID
    issue_date: date
    due_date: date
    currency: str = Field(min_length=3, max_length=3)
    notes: str | None = None
    discount_minor: int = Field(default=0, ge=0)
    items: list[ItemIn] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def due_not_before_issue(self):
        if self.due_date < self.issue_date:
            raise ValueError("Due date can't be before the issue date.")
        return self


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    description: str
    quantity: Decimal
    unit_price_minor: int
    tax_percent: Decimal
    amount_minor: int


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    number: str
    status: InvoiceStatus
    display_status: str  # status + "overdue" (computed, never stored)
    issue_date: date
    due_date: date
    currency: str
    notes: str | None
    subtotal_minor: int
    discount_minor: int
    tax_minor: int
    total_minor: int
    sent_at: datetime | None
    paid_at: datetime | None
    client: ClientOut
    items: list[ItemOut]
    share_url: str


class InvoiceListItem(BaseModel):
    id: uuid.UUID
    number: str
    client_name: str
    issue_date: date
    due_date: date
    currency: str
    total_minor: int
    display_status: str


class InvoicePage(BaseModel):
    items: list[InvoiceListItem]
    total: int


class StatusIn(BaseModel):
    status: InvoiceStatus


class SendIn(BaseModel):
    to: EmailStr | None = None  # defaults to the client's email
    message: str | None = Field(default=None, max_length=2000)


class SummaryOut(BaseModel):
    """Dashboard numbers. Grouped by currency because currencies can't be added together."""

    currency: str
    outstanding_minor: int
    overdue_minor: int
    overdue_count: int
    paid_this_month_minor: int
    draft_count: int


class PublicInvoiceOut(BaseModel):
    """What a client sees via the share link. No internal ids beyond the invoice itself."""

    invoice: InvoiceOut
    business: BusinessOut
    show_branding: bool
