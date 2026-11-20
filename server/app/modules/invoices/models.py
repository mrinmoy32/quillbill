import secrets
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, IdMixin, TimestampMixin


def new_public_token() -> str:
    return secrets.token_urlsafe(24)  # unguessable id used in the share link


class Invoice(Base, IdMixin, TimestampMixin):
    """MONEY RULE: all amounts are integers in the currency's smallest unit (paise, cents). Never floats."""

    __tablename__ = "invoices"

    business_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("businesses.id"), index=True)
    client_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("clients.id"), index=True)
    number: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | sent | paid | cancelled
    issue_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    notes: Mapped[str | None] = mapped_column(Text)

    subtotal_minor: Mapped[int] = mapped_column(BigInteger, default=0)
    discount_minor: Mapped[int] = mapped_column(BigInteger, default=0)
    tax_minor: Mapped[int] = mapped_column(BigInteger, default=0)
    total_minor: Mapped[int] = mapped_column(BigInteger, default=0)

    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    public_token: Mapped[str] = mapped_column(String(64), unique=True, index=True, default=new_public_token)

    client = relationship("Client", lazy="joined")
    items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceItem.position", lazy="selectin"
    )

    # Invoice numbers must be unique per business (INV-0001 can exist for many businesses).
    __table_args__ = (UniqueConstraint("business_id", "number", name="uq_invoices_business_number"),)


class InvoiceItem(Base, IdMixin):
    __tablename__ = "invoice_items"

    invoice_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    unit_price_minor: Mapped[int] = mapped_column(BigInteger)
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    amount_minor: Mapped[int] = mapped_column(BigInteger)  # quantity x unit price (before tax/discount)

    invoice: Mapped[Invoice] = relationship(back_populates="items")
