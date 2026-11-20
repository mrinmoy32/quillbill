import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { invoicesApi } from '@/api'
import Money from '@/components/Money'
import { Button, Card, ErrorState, PageHeader, Spinner, StatusBadge } from '@/components/ui'
import { useMe } from '@/features/auth/useMe'
import { formatDate } from '@/lib/dates'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const summary = useQuery({ queryKey: ['summary'], queryFn: invoicesApi.summary })
  const recent = useQuery({ queryKey: ['invoices', 'recent'], queryFn: () => invoicesApi.list({ limit: 5 }) })

  if (summary.isLoading || !me) return <Spinner />
  if (summary.error) return <ErrorState error={summary.error} onRetry={summary.refetch} />

  const billing = me.billing
  const needsSetup = me.business.name === 'My business'

  return (
    <>
      <PageHeader title={t('dashboard.title')} actions={<Button to="/invoices/new" icon={Plus}>{t('invoices.new')}</Button>} />

      {needsSetup && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-brand-line bg-brand-soft p-4">
          <p className="text-sm font-medium">{t('dashboard.setupPrompt')}</p>
          <Button to="/settings" size="sm" variant="secondary">{t('dashboard.setupAction')}</Button>
        </Card>
      )}

      {summary.data.map((s) => (
        <section key={s.currency} className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-ink-soft">{t('dashboard.outstanding')}</p>
            <p className="mt-2 font-display text-3xl font-semibold"><Money minor={s.outstanding_minor} currency={s.currency} /></p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-ink-soft">{t('dashboard.overdue')}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-red-700"><Money minor={s.overdue_minor} currency={s.currency} /></p>
            <p className="mt-1 text-xs text-ink-mute">{t('dashboard.overdueCount', { count: s.overdue_count })}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-ink-soft">{t('dashboard.paidThisMonth')}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-emerald-700"><Money minor={s.paid_this_month_minor} currency={s.currency} /></p>
          </Card>
        </section>
      ))}

      {billing.invoices_limit !== null && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span>{t('billing.usage', { used: billing.invoices_used_this_month, limit: billing.invoices_limit })}</span>
          <Link to="/billing" className="font-medium text-brand hover:underline">{t('billing.seePlans')}</Link>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold">{t('dashboard.recent')}</h2>
          <Link to="/invoices" className="text-sm font-medium text-brand hover:underline">{t('dashboard.viewAll')}</Link>
        </div>
        {recent.data?.items.length ? (
          <ul className="divide-y divide-line">
            {recent.data.items.map((inv) => (
              <li key={inv.id}>
                <Link to={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.client_name}</p>
                    <p className="text-sm text-ink-mute">{inv.number} · {formatDate(inv.issue_date)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium"><Money minor={inv.total_minor} currency={inv.currency} /></span>
                    <StatusBadge status={inv.display_status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">{t('dashboard.noInvoices')}</p>
        )}
      </Card>
    </>
  )
}
