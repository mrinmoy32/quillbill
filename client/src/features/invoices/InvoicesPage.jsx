import { useQuery } from '@tanstack/react-query'
import { FileText, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { invoicesApi } from '@/api'
import Money from '@/components/Money'
import { Button, Card, EmptyState, ErrorState, PageHeader, Spinner, StatusBadge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dates'

const TABS = ['all', 'draft', 'sent', 'overdue', 'paid']
const PAGE_SIZE = 20

export default function InvoicesPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices', { tab, search, page }],
    queryFn: () => invoicesApi.list({ status: tab === 'all' ? undefined : tab, q: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })
  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <>
      <PageHeader title={t('invoices.title')} actions={<Button to="/invoices/new" icon={Plus}>{t('invoices.new')}</Button>} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
          {TABS.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => { setTab(id); setPage(0) }}
              className={cn('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium', tab === id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-black/5')}
            >
              {t(id === 'all' ? 'invoices.all' : `status.${id}`)}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder={t('invoices.search')}
            aria-label={t('invoices.search')}
            className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={tab === 'all' && !search ? t('invoices.emptyTitle') : t('invoices.noMatches')}
            text={tab === 'all' && !search ? t('invoices.emptyText') : undefined}
            action={tab === 'all' && !search && <Button to="/invoices/new" icon={Plus}>{t('invoices.createFirst')}</Button>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((inv) => (
              <li key={inv.id}>
                <Link to={`/invoices/${inv.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-canvas sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.client_name}</p>
                    <p className="text-sm text-ink-mute">{inv.number} · {t('invoices.dueOn', { date: formatDate(inv.due_date) })}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-5">
                    <span className="font-medium"><Money minor={inv.total_minor} currency={inv.currency} /></span>
                    <span className="sm:w-20 sm:text-right"><StatusBadge status={inv.display_status} /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <span>{t('common.showing', { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, total), total })}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('common.previous')}</Button>
            <Button variant="secondary" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>{t('common.next')}</Button>
          </div>
        </div>
      )}
    </>
  )
}
