import uuid

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class Business(Base, IdMixin, TimestampMixin):
    """The 'tenant'. Everything a customer owns hangs off a business."""

    __tablename__ = "businesses"

    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(40))
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    country: Mapped[str] = mapped_column(String(2), default="IN")  # ISO 3166-1 alpha-2
    tax_id: Mapped[str | None] = mapped_column(String(50))  # GSTIN in India, VAT no. elsewhere
    tax_label: Mapped[str] = mapped_column(String(20), default="GST")
    logo_url: Mapped[str | None] = mapped_column(String(500))

    currency: Mapped[str] = mapped_column(String(3), default="INR")  # ISO 4217
    locale: Mapped[str] = mapped_column(String(10), default="en_IN")  # number/date formatting
    invoice_prefix: Mapped[str] = mapped_column(String(10), default="INV")
    next_invoice_number: Mapped[int] = mapped_column(Integer, default=1)
    default_tax_percent: Mapped[float] = mapped_column(default=18)
    default_due_days: Mapped[int] = mapped_column(Integer, default=15)
    payment_details: Mapped[str | None] = mapped_column(Text)  # bank account / UPI shown on invoice
    default_notes: Mapped[str | None] = mapped_column(Text)
