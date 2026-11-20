// Same rules as server/app/modules/invoices/calculations.py. KEEP THE TWO IN SYNC.
// This powers the live preview while typing; the server's numbers are the ones saved.
//   line amount = qty x unit price; discount spread across lines in proportion;
//   tax per line on (amount - its discount share); total = subtotal - discount + tax.

const roundHalfUp = (x) => Math.round(x + 1e-9)

/** @param {{quantity:number, unitPriceMinor:number, taxPercent:number}[]} lines */
export function calculateTotals(lines, discountMinor = 0) {
  const amounts = lines.map((l) => roundHalfUp((Number(l.quantity) || 0) * (Number(l.unitPriceMinor) || 0)))
  const subtotal = amounts.reduce((a, b) => a + b, 0)
  const discount = Math.max(0, Math.min(discountMinor || 0, subtotal))

  let tax = 0
  lines.forEach((l, i) => {
    const share = subtotal ? (discount * amounts[i]) / subtotal : 0
    tax += roundHalfUp(((amounts[i] - share) * (Number(l.taxPercent) || 0)) / 100)
  })
  return { amounts, subtotal, discount, tax, total: subtotal - discount + tax }
}
