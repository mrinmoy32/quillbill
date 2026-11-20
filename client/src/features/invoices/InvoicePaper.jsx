import { useTranslation } from 'react-i18next'
import StatusBadge from '@/components/ui/StatusBadge'
import { brand } from '@/config/brand'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

/**
 * The invoice, drawn like a sheet of paper. Used in THREE places so it always looks the same:
 * invoice detail, the live preview in the editor, and the public share page.
 * It needs no login or hooks: everything arrives as props.
 */
export default function InvoicePaper({ invoice, business, locale = 'en-IN', showBranding = false }) {
  const { t } = useTranslation()
  const money = (minor) => formatMoney(minor, invoice.currency, locale)
  const client = invoice.client || {}
  const taxLabel = business.tax_label || 'Tax'
  const cityLine = (o) => [o.city, o.state, o.postal_code].filter(Boolean).join(', ')

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white text-sm shadow-sm">
      <div className="h-1.5 bg-accent" aria-hidden />
      <div className="p-5 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {business.logo_url && <img src={business.logo_url} alt="" className="mb-3 max-h-12 max-w-[10rem] object-contain" />}
            <p className="font-display text-lg font-semibold">{business.name}</p>
            <div className="mt-1 whitespace-pre-line text-ink-soft">
              {business.address}
              {cityLine(business) && `\n${cityLine(business)}`}
              {business.tax_id && `\n${taxLabel}: ${business.tax_id}`}
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-semibold text-brand">{t('invoices.invoice')}</p>
            <p className="mt-1 font-medium">{invoice.number}</p>
            {invoice.display_status && <div className="mt-2"><StatusBadge status={invoice.display_status} /></div>}
          </div>
        </header>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-ink-mute">{t('invoices.billedTo')}</p>
            <p className="mt-1 font-medium">{client.name || '—'}</p>
            <div className="whitespace-pre-line text-ink-soft">
              {client.address}
              {cityLine(client) && `\n${cityLine(client)}`}
              {client.tax_id && `\n${taxLabel}: ${client.tax_id}`}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 sm:justify-self-end">
            <dt className="text-ink-mute">{t('invoices.issued')}</dt>
            <dd className="text-right">{formatDate(invoice.issue_date, locale)}</dd>
            <dt className="text-ink-mute">{t('invoices.due')}</dt>
            <dd className="text-right font-semibold">{formatDate(invoice.due_date, locale)}</dd>
          </dl>
        </section>

        <section className="mt-8">
          <div className="border-b border-ink pb-2 font-medium">{t('invoices.items')}</div>
          <ul className="divide-y divide-line">
            {invoice.items.map((item, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{item.description || '—'}</p>
                  <p className="text-xs text-ink-mute">
                    {Number(item.quantity)} × {money(item.unit_price_minor)}
                    {Number(item.tax_percent) > 0 && ` · ${taxLabel} ${Number(item.tax_percent)}%`}
                  </p>
                </div>
                <p className="shrink-0 font-medium">{money(item.amount_minor)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="ml-auto mt-4 w-full max-w-xs space-y-1.5">
          <Row label={t('invoices.subtotal')} value={money(invoice.subtotal_minor)} />
          {invoice.discount_minor > 0 && <Row label={t('invoices.discount')} value={`− ${money(invoice.discount_minor)}`} />}
          <Row label={taxLabel} value={money(invoice.tax_minor)} />
          <div className="flex justify-between border-t border-ink pt-2 font-display text-lg font-semibold">
            <span>{t('invoices.totalDue')}</span>
            <span>{money(invoice.total_minor)}</span>
          </div>
        </section>

        {business.payment_details && (
          <section className="mt-8">
            <p className="font-medium">{t('invoices.howToPay')}</p>
            <p className="mt-1 whitespace-pre-line text-ink-soft">{business.payment_details}</p>
          </section>
        )}
        {invoice.notes && (
          <section className="mt-6">
            <p className="font-medium">{t('invoices.notes')}</p>
            <p className="mt-1 whitespace-pre-line text-ink-soft">{invoice.notes}</p>
          </section>
        )}
        {showBranding && <p className="mt-10 text-center text-xs text-ink-mute">{brand.pdfFooter.replace('{name}', brand.name)}</p>}
      </div>
    </article>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-ink-soft">
      <span>{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  )
}
