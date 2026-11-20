import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { businessApi } from '@/api'
import { Button, Card, Input, PageHeader, Select, Spinner, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/useMe'
import { fieldErrors } from '@/lib/forms'

// Start small; add rows as you open new markets. `locale` controls number/date formatting.
const CURRENCIES = [
  { code: 'INR', locale: 'en_IN', label: 'INR – Indian rupee' },
  { code: 'USD', locale: 'en_US', label: 'USD – US dollar' },
  { code: 'EUR', locale: 'en_IE', label: 'EUR – Euro' },
  { code: 'GBP', locale: 'en_GB', label: 'GBP – Pound sterling' },
  { code: 'AED', locale: 'en_AE', label: 'AED – UAE dirham' },
  { code: 'SGD', locale: 'en_SG', label: 'SGD – Singapore dollar' },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (me && !form) setForm(Object.fromEntries(Object.entries(me.business).map(([k, v]) => [k, v ?? ''])))
  }, [me, form])

  const save = useMutation({
    mutationFn: () => {
      const { id, next_invoice_number, ...rest } = form // these two are not editable here
      return businessApi.update({ ...rest, email: rest.email || null, default_tax_percent: Number(rest.default_tax_percent), default_due_days: Number(rest.default_due_days) })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); setErrors({}); toast(t('settings.saved')) },
    onError: (e) => { setErrors(fieldErrors(e)); toast(e.message, 'error') },
  })

  if (!form) return <Spinner />
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setCurrency = (e) => {
    const c = CURRENCIES.find((x) => x.code === e.target.value)
    setForm((f) => ({ ...f, currency: c.code, locale: c.locale }))
  }

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="max-w-3xl space-y-5">
        <Card className="space-y-4 p-4 sm:p-5">
          <h2 className="text-base font-semibold">{t('settings.business')}</h2>
          <Input label={t('settings.name')} value={form.name} onChange={set('name')} error={errors.name} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input type="email" label={t('settings.email')} value={form.email} onChange={set('email')} error={errors.email} />
            <Input type="tel" label={t('settings.phone')} value={form.phone} onChange={set('phone')} />
          </div>
          <Textarea label={t('settings.address')} value={form.address} onChange={set('address')} rows={2} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label={t('clients.city')} value={form.city} onChange={set('city')} />
            <Input label={t('clients.state')} value={form.state} onChange={set('state')} />
            <Input label={t('clients.postalCode')} value={form.postal_code} onChange={set('postal_code')} />
          </div>
          <Input label={t('settings.logoUrl')} value={form.logo_url} onChange={set('logo_url')} hint={t('settings.logoHint')} placeholder="https://…" />
        </Card>

        <Card className="space-y-4 p-4 sm:p-5">
          <h2 className="text-base font-semibold">{t('settings.invoiceDefaults')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t('settings.currency')} value={form.currency} onChange={setCurrency}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
            <Input label={t('settings.prefix')} value={form.invoice_prefix} onChange={set('invoice_prefix')} error={errors.invoice_prefix} hint={t('settings.prefixHint')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label={t('settings.taxLabel')} value={form.tax_label} onChange={set('tax_label')} hint={t('settings.taxLabelHint')} />
            <Input label={t('settings.taxId')} value={form.tax_id} onChange={set('tax_id')} hint={t('settings.taxIdHint')} />
            <Input label={t('settings.defaultTax')} inputMode="decimal" value={form.default_tax_percent} onChange={set('default_tax_percent')} />
          </div>
          <Input label={t('settings.dueDays')} inputMode="numeric" value={form.default_due_days} onChange={set('default_due_days')} className="sm:max-w-xs" />
          <Textarea label={t('settings.paymentDetails')} value={form.payment_details} onChange={set('payment_details')} hint={t('settings.paymentHint')} />
          <Textarea label={t('settings.defaultNotes')} value={form.default_notes} onChange={set('default_notes')} />
        </Card>

        <div className="flex justify-end"><Button type="submit" size="lg" loading={save.isPending}>{t('common.saveChanges')}</Button></div>
      </form>
    </>
  )
}
