// MONEY RULE: amounts are integers in the smallest unit (paise, cents). Convert only at the screen edge.

/** Number of decimals the currency uses (INR 2, JPY 0, KWD 3). */
export function currencyDigits(currency) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits
}

/** 123450 + 'INR' -> "₹1,234.50" (Indian grouping when locale is en-IN) */
export function formatMoney(minor, currency = 'INR', locale = 'en-IN') {
  const value = (minor ?? 0) / 10 ** currencyDigits(currency)
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}

/** What the user typed ("1234.5") -> integer minor units (123450). */
export function toMinor(input, currency = 'INR') {
  const n = Number.parseFloat(String(input).replaceAll(',', ''))
  if (Number.isNaN(n)) return 0
  return Math.round(n * 10 ** currencyDigits(currency) + 1e-9)
}

/** Integer minor units -> string for an <input> ("1234.50"). */
export function fromMinor(minor, currency = 'INR') {
  const digits = currencyDigits(currency)
  return ((minor ?? 0) / 10 ** digits).toFixed(digits)
}

/** Server locales look like "en_IN"; Intl wants "en-IN". */
export const intlLocale = (serverLocale = 'en_IN') => serverLocale.replace('_', '-')
