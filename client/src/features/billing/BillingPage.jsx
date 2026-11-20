import { useMutation, useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { billingApi } from '@/api'
import { Button, Card, ErrorState, PageHeader, Spinner, useToast } from '@/components/ui'
import { formatDate } from '@/lib/dates'

// Display prices only; what customers are actually charged is set in the payment provider's plan.
const PRO_PRICE = '₹299'

export default function BillingPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['billing'], queryFn: billingApi.status })
  const checkout = useMutation({
    mutationFn: billingApi.checkout,
    onSuccess: ({ checkout_url }) => { window.location.href = checkout_url },
    onError: (e) => toast(e.message, 'error'),
  })

  if (isLoading) return <Spinner />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  const isPro = data.plan === 'pro'

  return (
    <>
      <PageHeader title={t('billing.title')} subtitle={isPro && data.current_period_end ? t('billing.renews', { date: formatDate(data.current_period_end.slice(0, 10)) }) : t('billing.usage', { used: data.invoices_used_this_month, limit: data.invoices_limit ?? '∞' })} />
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <Plan name={t('billing.planFree')} price="₹0" features={t('billing.freeFeatures', { returnObjects: true })} current={!isPro} currentLabel={t('billing.current')} />
        <Plan
          highlight
          name={t('billing.planPro')}
          price={PRO_PRICE}
          suffix={t('billing.perMonth')}
          features={t('billing.proFeatures', { returnObjects: true })}
          current={isPro}
          currentLabel={t('billing.current')}
          action={!isPro && (
            <Button size="lg" className="w-full" loading={checkout.isPending} disabled={!data.checkout_available} onClick={() => checkout.mutate()}>
              {data.checkout_available ? t('billing.upgrade') : t('billing.comingSoon')}
            </Button>
          )}
        />
      </div>
    </>
  )
}

function Plan({ name, price, suffix, features, current, currentLabel, action, highlight }) {
  return (
    <Card className={highlight ? 'border-brand p-6 ring-1 ring-brand' : 'p-6'}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{name}</h2>
        {current && <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">{currentLabel}</span>}
      </div>
      <p className="mt-3 font-display text-4xl font-semibold">{price}<span className="text-base font-normal text-ink-mute">{suffix}</span></p>
      <ul className="mt-5 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />{f}</li>
        ))}
      </ul>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  )
}
