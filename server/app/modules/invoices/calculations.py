"""Invoice maths. Pure functions (no database), so they are easy to test.

The frontend has the same logic in client/src/lib/invoiceMath.js for the live preview.
KEEP THE TWO IN SYNC. The server result is the one that gets saved.

Rules:
  line amount = quantity x unit price                     (rounded to whole paise/cents)
  discount    = flat amount off the subtotal, spread across lines in proportion
  tax         = per line, on (line amount - its share of discount)
  total       = subtotal - discount + tax
Rounding is "half up" (0.5 rounds up), the usual accounting convention.
"""
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal


@dataclass
class LineInput:
    quantity: Decimal
    unit_price_minor: int
    tax_percent: Decimal


@dataclass
class Totals:
    line_amounts: list[int]
    subtotal: int
    discount: int
    tax: int
    total: int


def _round(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def calculate_totals(lines: list[LineInput], discount_minor: int = 0) -> Totals:
    amounts = [_round(Decimal(line.quantity) * line.unit_price_minor) for line in lines]
    subtotal = sum(amounts)
    discount = max(0, min(discount_minor, subtotal))  # can't discount more than the subtotal

    tax = 0
    for line, amount in zip(lines, amounts):
        share = Decimal(discount) * amount / subtotal if subtotal else Decimal(0)
        taxable = Decimal(amount) - share
        tax += _round(taxable * Decimal(line.tax_percent) / 100)

    return Totals(line_amounts=amounts, subtotal=subtotal, discount=discount, tax=tax, total=subtotal - discount + tax)
