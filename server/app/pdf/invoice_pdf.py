"""Render an invoice as a PDF with ReportLab (pure Python: no system libraries, works on Lambda).

DejaVu Sans is bundled in ./fonts because the built-in PDF fonts can't draw the rupee sign.
To support other scripts later (Devanagari, Arabic...) add a Noto font here.
"""
from io import BytesIO
from xml.sax.saxutils import escape
from pathlib import Path

from babel.numbers import format_currency, get_currency_precision
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.settings import settings

FONTS = Path(__file__).parent / "fonts"
pdfmetrics.registerFont(TTFont("Body", str(FONTS / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("Body-Bold", str(FONTS / "DejaVuSans-Bold.ttf")))

INK = colors.HexColor("#14213D")
MUTED = colors.HexColor("#667085")
LINE = colors.HexColor("#E4E7EC")


def money(minor: int, currency: str, locale: str) -> str:
    """12345 paise, INR, en_IN  ->  ₹123.45 (with Indian digit grouping)."""
    amount = minor / (10 ** get_currency_precision(currency))
    try:
        return format_currency(amount, currency, locale=locale)
    except Exception:  # unknown locale string: fall back rather than fail the PDF
        return format_currency(amount, currency, locale="en_US")


def _style(name: str, **kw) -> ParagraphStyle:
    return ParagraphStyle(name, fontName=kw.pop("fontName", "Body"), fontSize=kw.pop("fontSize", 9), leading=kw.pop("leading", 13), textColor=kw.pop("textColor", INK), **kw)


def esc(text) -> str:
    """User-typed text goes into ReportLab's mini-HTML, so escape < > & first."""
    return escape(str(text)) if text else ""


def _lines(*parts) -> str:
    return "<br/>".join(esc(p) for p in parts if p)


def render_invoice_pdf(invoice, business, client, show_branding: bool) -> bytes:
    locale = business.locale
    cur = invoice.currency
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm, title=f"Invoice {invoice.number}")
    primary_hex = settings.brand.colors.get('primary', '#2540D9')
    story = []

    # Header: business on the left, "INVOICE" + number on the right
    biz_address = _lines(business.address, ", ".join(x for x in [business.city, business.state, business.postal_code] if x), business.email, business.phone, f"{business.tax_label}: {business.tax_id}" if business.tax_id else None)
    header = Table(
        [[Paragraph(f"<b>{esc(business.name)}</b><br/><font color='#667085'>{biz_address}</font>", _style("biz", fontSize=10, leading=14)),
          Paragraph(f"<font size=20 color='{primary_hex}'><b>Invoice</b></font><br/>{esc(invoice.number)}", _style("inv", alignment=2, fontSize=10, leading=16))]],
        colWidths=[105 * mm, 69 * mm],
    )
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story += [header, Spacer(1, 10 * mm)]

    # Bill to + dates
    client_addr = _lines(client.address, ", ".join(x for x in [client.city, client.state, client.postal_code] if x), client.email, f"{business.tax_label}: {client.tax_id}" if client.tax_id else None)
    meta = Table(
        [[Paragraph(f"<font color='#667085'>Billed to</font><br/><b>{esc(client.name)}</b><br/>{client_addr}", _style("to")),
          Paragraph(f"<font color='#667085'>Issued</font> {invoice.issue_date:%d %b %Y}<br/><font color='#667085'>Due</font> <b>{invoice.due_date:%d %b %Y}</b>", _style("dates", alignment=2, leading=15))]],
        colWidths=[105 * mm, 69 * mm],
    )
    meta.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story += [meta, Spacer(1, 8 * mm)]

    # Line items
    right = _style("r", alignment=2)
    rows = [[Paragraph("<b>Description</b>", _style("h")), Paragraph("<b>Qty</b>", right), Paragraph("<b>Rate</b>", right), Paragraph(f"<b>{business.tax_label} %</b>", right), Paragraph("<b>Amount</b>", right)]]
    for item in invoice.items:
        qty = f"{item.quantity.normalize():f}"
        rows.append([Paragraph(esc(item.description), _style("d")), Paragraph(qty, right), Paragraph(money(item.unit_price_minor, cur, locale), right), Paragraph(f"{item.tax_percent.normalize():f}%", right), Paragraph(money(item.amount_minor, cur, locale), right)])
    items = Table(rows, colWidths=[72 * mm, 16 * mm, 30 * mm, 20 * mm, 36 * mm], repeatRows=1)
    items.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, 0), 1, INK), ("LINEBELOW", (0, 1), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("LEFTPADDING", (0, 0), (0, -1), 0), ("RIGHTPADDING", (-1, 0), (-1, -1), 0)]))
    story += [items, Spacer(1, 4 * mm)]

    # Totals
    t = [["Subtotal", money(invoice.subtotal_minor, cur, locale)]]
    if invoice.discount_minor:
        t.append(["Discount", "-" + money(invoice.discount_minor, cur, locale)])
    t.append([business.tax_label, money(invoice.tax_minor, cur, locale)])
    t.append(["Total", money(invoice.total_minor, cur, locale)])
    totals = Table([[Paragraph(a, _style("tl", alignment=2)), Paragraph(b, right)] for a, b in t[:-1]] + [[Paragraph("<b>Total due</b>", _style("tt", alignment=2, fontSize=11)), Paragraph(f"<b>{t[-1][1]}</b>", _style("tv", alignment=2, fontSize=11))]], colWidths=[130 * mm, 44 * mm])
    totals.setStyle(TableStyle([("LINEABOVE", (0, -1), (-1, -1), 1, INK), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (-1, 0), (-1, -1), 0)]))
    story.append(totals)

    # Payment details + notes
    if business.payment_details:
        story += [Spacer(1, 10 * mm), Paragraph("<b>How to pay</b>", _style("p1")), Paragraph(esc(business.payment_details).replace("\n", "<br/>"), _style("p2"))]
    if invoice.notes:
        story += [Spacer(1, 6 * mm), Paragraph("<b>Notes</b>", _style("n1")), Paragraph(esc(invoice.notes).replace("\n", "<br/>"), _style("n2"))]

    def footer(canvas, _doc):
        if show_branding:
            canvas.setFont("Body", 8)
            canvas.setFillColor(MUTED)
            canvas.drawCentredString(A4[0] / 2, 10 * mm, settings.brand.pdfFooter.format(name=settings.brand.name))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()

