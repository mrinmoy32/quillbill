"""Invoice business logic. Routers call these functions; these functions talk to the database.

Every function takes `tenant` and filters by `tenant.business_id` (multi-tenancy rule).
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import Tenant
from app.core.errors import Conflict, NotFound
from app.modules.billing import service as billing_service
from app.modules.business.models import Business
from app.modules.clients import service as clients_service
from app.modules.clients.models import Client
from app.modules.invoices.calculations import LineInput, calculate_totals
from app.modules.invoices.models import Invoice, InvoiceItem
from app.modules.invoices.schemas import InvoiceIn, SummaryOut
from app.settings import settings

EDITABLE_STATUSES = {"draft", "sent"}


def display_status(invoice: Invoice) -> str:
    """'overdue' is not stored: it is simply 'sent' with a due date in the past."""
    if invoice.status == "sent" and invoice.due_date < date.today():
        return "overdue"
    return invoice.status


def share_url(invoice: Invoice) -> str:
    return f"{settings.config.public_app_url.rstrip('/')}/i/{invoice.public_token}"


def _next_number(db: Session, business: Business) -> str:
    """Take the next invoice number. The row lock stops two requests getting the same number."""
    locked = db.scalar(select(Business).where(Business.id == business.id).with_for_update())
    number = f"{locked.invoice_prefix}-{locked.next_invoice_number:04d}"
    locked.next_invoice_number += 1
    return number


def _apply_items(invoice: Invoice, data: InvoiceIn) -> None:
    lines = [LineInput(i.quantity, i.unit_price_minor, i.tax_percent) for i in data.items]
    totals = calculate_totals(lines, data.discount_minor)
    invoice.items.clear()
    for position, (item, amount) in enumerate(zip(data.items, totals.line_amounts)):
        invoice.items.append(
            InvoiceItem(
                position=position,
                description=item.description,
                quantity=item.quantity,
                unit_price_minor=item.unit_price_minor,
                tax_percent=item.tax_percent,
                amount_minor=amount,
            )
        )
    invoice.subtotal_minor = totals.subtotal
    invoice.discount_minor = totals.discount
    invoice.tax_minor = totals.tax
    invoice.total_minor = totals.total


def get_invoice(db: Session, tenant: Tenant, invoice_id: uuid.UUID) -> Invoice:
    invoice = db.scalar(select(Invoice).where(Invoice.id == invoice_id, Invoice.business_id == tenant.business_id))
    if not invoice:
        raise NotFound("Invoice not found.")
    return invoice


def create_invoice(db: Session, tenant: Tenant, data: InvoiceIn) -> Invoice:
    billing_service.assert_can_create_invoice(db, tenant.business)
    clients_service.get_client(db, tenant, data.client_id)  # proves the client belongs to this business
    invoice = Invoice(
        business_id=tenant.business_id,
        client_id=data.client_id,
        number=_next_number(db, tenant.business),
        issue_date=data.issue_date,
        due_date=data.due_date,
        currency=data.currency.upper(),
        notes=data.notes,
    )
    _apply_items(invoice, data)
    db.add(invoice)
    db.flush()
    return invoice


def update_invoice(db: Session, tenant: Tenant, invoice_id: uuid.UUID, data: InvoiceIn) -> Invoice:
    invoice = get_invoice(db, tenant, invoice_id)
    if invoice.status not in EDITABLE_STATUSES:
        raise Conflict("Paid or cancelled invoices can't be edited. Mark it as sent first.", code="invoice_locked")
    clients_service.get_client(db, tenant, data.client_id)
    invoice.client_id = data.client_id
    invoice.issue_date = data.issue_date
    invoice.due_date = data.due_date
    invoice.currency = data.currency.upper()
    invoice.notes = data.notes
    _apply_items(invoice, data)
    db.flush()
    db.refresh(invoice)
    return invoice


def delete_invoice(db: Session, tenant: Tenant, invoice_id: uuid.UUID) -> None:
    invoice = get_invoice(db, tenant, invoice_id)
    if invoice.status != "draft":
        raise Conflict("Only drafts can be deleted. Cancel the invoice instead.", code="invoice_not_draft")
    db.delete(invoice)


def duplicate_invoice(db: Session, tenant: Tenant, invoice_id: uuid.UUID) -> Invoice:
    source = get_invoice(db, tenant, invoice_id)
    billing_service.assert_can_create_invoice(db, tenant.business)
    today = date.today()
    copy = Invoice(
        business_id=tenant.business_id,
        client_id=source.client_id,
        number=_next_number(db, tenant.business),
        issue_date=today,
        due_date=today + timedelta(days=tenant.business.default_due_days),
        currency=source.currency,
        notes=source.notes,
        subtotal_minor=source.subtotal_minor,
        discount_minor=source.discount_minor,
        tax_minor=source.tax_minor,
        total_minor=source.total_minor,
    )
    for item in source.items:
        copy.items.append(
            InvoiceItem(
                position=item.position,
                description=item.description,
                quantity=item.quantity,
                unit_price_minor=item.unit_price_minor,
                tax_percent=item.tax_percent,
                amount_minor=item.amount_minor,
            )
        )
    db.add(copy)
    db.flush()
    return copy


def set_status(db: Session, tenant: Tenant, invoice_id: uuid.UUID, status: str) -> Invoice:
    invoice = get_invoice(db, tenant, invoice_id)
    now = datetime.now(timezone.utc)
    invoice.status = status
    if status == "sent" and not invoice.sent_at:
        invoice.sent_at = now
    invoice.paid_at = now if status == "paid" else None
    db.flush()
    return invoice


def list_invoices(db: Session, tenant: Tenant, status: str | None, q: str | None, limit: int, offset: int):
    stmt = select(Invoice).join(Client, Client.id == Invoice.client_id).where(Invoice.business_id == tenant.business_id)
    today = date.today()
    if status == "overdue":
        stmt = stmt.where(Invoice.status == "sent", Invoice.due_date < today)
    elif status == "sent":
        stmt = stmt.where(Invoice.status == "sent", Invoice.due_date >= today)
    elif status:
        stmt = stmt.where(Invoice.status == status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Invoice.number.ilike(like), Client.name.ilike(like)))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Invoice.created_at.desc()).limit(limit).offset(offset)).unique().all()
    return rows, total


def summary(db: Session, tenant: Tenant) -> list[SummaryOut]:
    """Dashboard totals. Small businesses have few invoices, so computing in Python is fine and easy to read."""
    invoices = db.scalars(select(Invoice).where(Invoice.business_id == tenant.business_id)).unique().all()
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    by_currency: dict[str, SummaryOut] = {}
    for inv in invoices:
        row = by_currency.setdefault(inv.currency, SummaryOut(currency=inv.currency, outstanding_minor=0, overdue_minor=0, overdue_count=0, paid_this_month_minor=0, draft_count=0))
        state = display_status(inv)
        if state in ("sent", "overdue"):
            row.outstanding_minor += inv.total_minor
        if state == "overdue":
            row.overdue_minor += inv.total_minor
            row.overdue_count += 1
        if state == "draft":
            row.draft_count += 1
        if state == "paid" and inv.paid_at and inv.paid_at >= month_start:
            row.paid_this_month_minor += inv.total_minor
    if not by_currency:
        by_currency[tenant.business.currency] = SummaryOut(currency=tenant.business.currency, outstanding_minor=0, overdue_minor=0, overdue_count=0, paid_this_month_minor=0, draft_count=0)
    return list(by_currency.values())
