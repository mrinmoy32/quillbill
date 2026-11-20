"""Turn database objects into API responses (adds computed fields like display_status)."""
from app.modules.invoices import service
from app.modules.invoices.models import Invoice
from app.modules.invoices.schemas import InvoiceListItem, InvoiceOut


def to_out(invoice: Invoice) -> InvoiceOut:
    # copy every plain column that InvoiceOut declares; the computed/nested ones are added below
    computed = {"display_status", "client", "items", "share_url"}
    base = {name: getattr(invoice, name) for name in InvoiceOut.model_fields if name not in computed}
    return InvoiceOut(
        **base,
        display_status=service.display_status(invoice),
        client=invoice.client,
        items=invoice.items,
        share_url=service.share_url(invoice),
    )


def to_list_item(invoice: Invoice) -> InvoiceListItem:
    return InvoiceListItem(
        id=invoice.id,
        number=invoice.number,
        client_name=invoice.client.name,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        total_minor=invoice.total_minor,
        display_status=service.display_status(invoice),
    )
