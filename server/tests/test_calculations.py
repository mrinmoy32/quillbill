from decimal import Decimal

from app.modules.invoices.calculations import LineInput, calculate_totals


def line(qty, price, tax):
    return LineInput(Decimal(qty), price, Decimal(tax))


def test_simple_gst_invoice():
    # 2 x Rs 5,000 at 18% GST
    t = calculate_totals([line("2", 500000, "18")])
    assert (t.subtotal, t.tax, t.total) == (1_000_000, 180_000, 1_180_000)


def test_discount_reduces_tax_too():
    # Rs 10,000 - Rs 1,000 discount = Rs 9,000 taxable; 18% = Rs 1,620
    t = calculate_totals([line("1", 1_000_000, "18")], discount_minor=100_000)
    assert (t.discount, t.tax, t.total) == (100_000, 162_000, 1_062_000)


def test_discount_cannot_exceed_subtotal():
    t = calculate_totals([line("1", 10_000, "18")], discount_minor=999_999)
    assert t.discount == 10_000 and t.total == 0


def test_rounding_is_half_up():
    # 0.5 paise rounds up to 1
    assert calculate_totals([line("1", 5, "10")]).tax == 1


def test_mixed_tax_rates():
    t = calculate_totals([line("1", 100_000, "5"), line("1", 100_000, "18")])
    assert t.tax == 5_000 + 18_000
