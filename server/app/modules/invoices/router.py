import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import Tenant, get_tenant
from app.core.errors import AppError
from app.integrations import ses
from app.modules.billing import service as billing_service
from app.modules.invoices import mappers, service
from app.modules.invoices.schemas import InvoiceIn, InvoiceOut, InvoicePage, SendIn, StatusIn, SummaryOut
from app.pdf.invoice_pdf import render_invoice_pdf
from app.settings import settings

router = APIRouter(prefix="/invoices", tags=["invoices"])

FilterStatus = Literal["draft", "sent", "overdue", "paid", "cancelled"]


@router.get("", response_model=InvoicePage)
def list_invoices(
    status: FilterStatus | None = None,
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    tenant: Tenant = Depends(get_tenant),
    db: Session = Depends(get_db),
):
    rows, total = service.list_invoices(db, tenant, status, q, limit, offset)
    return InvoicePage(items=[mappers.to_list_item(r) for r in rows], total=total)


@router.get("/summary", response_model=list[SummaryOut])
def summary(tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return service.summary(db, tenant)


@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(data: InvoiceIn, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return mappers.to_out(service.create_invoice(db, tenant, data))


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: uuid.UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return mappers.to_out(service.get_invoice(db, tenant, invoice_id))


@router.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(invoice_id: uuid.UUID, data: InvoiceIn, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return mappers.to_out(service.update_invoice(db, tenant, invoice_id, data))


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: uuid.UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    service.delete_invoice(db, tenant, invoice_id)
    return Response(status_code=204)


@router.post("/{invoice_id}/duplicate", response_model=InvoiceOut, status_code=201)
def duplicate_invoice(invoice_id: uuid.UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return mappers.to_out(service.duplicate_invoice(db, tenant, invoice_id))


@router.post("/{invoice_id}/status", response_model=InvoiceOut)
def set_status(invoice_id: uuid.UUID, data: StatusIn, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    return mappers.to_out(service.set_status(db, tenant, invoice_id, data.status))


@router.get("/{invoice_id}/pdf")
def download_pdf(invoice_id: uuid.UUID, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    invoice = service.get_invoice(db, tenant, invoice_id)
    pdf = render_invoice_pdf(invoice, tenant.business, invoice.client, billing_service.show_branding_footer(db, tenant.business_id))
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{invoice.number}.pdf"'})


@router.post("/{invoice_id}/send", response_model=InvoiceOut)
def send_invoice(invoice_id: uuid.UUID, data: SendIn, tenant: Tenant = Depends(get_tenant), db: Session = Depends(get_db)):
    """Email the invoice (PDF attached + share link) and mark it as sent."""
    invoice = service.get_invoice(db, tenant, invoice_id)
    to = data.to or invoice.client.email
    if not to:
        raise AppError("Add an email address for this client, or enter one to send to.", code="no_recipient")

    business = tenant.business
    pdf = render_invoice_pdf(invoice, business, invoice.client, billing_service.show_branding_footer(db, business.id))
    body = (
        f"Hi {invoice.client.name},\n\n"
        f"{data.message + chr(10) + chr(10) if data.message else ''}"
        f"Please find invoice {invoice.number} from {business.name} attached.\n"
        f"You can also view it online: {service.share_url(invoice)}\n\n"
        f"Thank you,\n{business.name}"
    )
    ses.send_email(to, f"Invoice {invoice.number} from {business.name}", body, attachment=(f"{invoice.number}.pdf", pdf), reply_to=business.email)
    if invoice.status == "draft":
        service.set_status(db, tenant, invoice.id, "sent")
    return mappers.to_out(invoice)
