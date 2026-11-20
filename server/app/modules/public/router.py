"""Pages a *client* can open without logging in, via the unguessable share link /i/<token>."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import NotFound
from app.modules.billing import service as billing_service
from app.modules.business.models import Business
from app.modules.business.schemas import BusinessOut
from app.modules.invoices import mappers
from app.modules.invoices.models import Invoice
from app.modules.invoices.schemas import PublicInvoiceOut
from app.pdf.invoice_pdf import render_invoice_pdf

router = APIRouter(prefix="/public", tags=["public"])


def _load(db: Session, token: str) -> tuple[Invoice, Business]:
    invoice = db.scalar(select(Invoice).where(Invoice.public_token == token))
    if not invoice or invoice.status == "draft":  # drafts are never public
        raise NotFound("This invoice link is not valid.")
    return invoice, db.get(Business, invoice.business_id)


@router.get("/invoices/{token}", response_model=PublicInvoiceOut)
def public_invoice(token: str, db: Session = Depends(get_db)):
    invoice, business = _load(db, token)
    return PublicInvoiceOut(
        invoice=mappers.to_out(invoice),
        business=BusinessOut.model_validate(business),
        show_branding=billing_service.show_branding_footer(db, business.id),
    )


@router.get("/invoices/{token}/pdf")
def public_invoice_pdf(token: str, db: Session = Depends(get_db)):
    invoice, business = _load(db, token)
    pdf = render_invoice_pdf(invoice, business, invoice.client, billing_service.show_branding_footer(db, business.id))
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{invoice.number}.pdf"'})
