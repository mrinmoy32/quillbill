import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { clientsApi, invoicesApi } from '@/api'
import { Button, Card, ErrorState, Input, Modal, PageHeader, Select, Spinner, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/useMe'
import ClientForm from '@/features/clients/ClientForm'
import { addDays, today } from '@/lib/dates'
import { calculateTotals } from '@/lib/invoiceMath'
import { formatMoney, fromMinor, intlLocale, toMinor } from '@/lib/money'
import InvoicePaper from './InvoicePaper'

const blankItem = (tax) => ({ description: '', quantity: '1', price: '', tax: String(tax ?? 0) })

/** Create (/invoices/new) or edit (/invoices/:id/edit). Form fields are strings; converted on save. */
export default function InvoiceEditorPage() {
  const { id } = useParams()
  const isEdit = !!id
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: () => clientsApi.list() })
  const existing = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id), enabled: isEdit })

  const [form, setForm] = useState(null)
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [limitHit, setLimitHit] = useState(false)
  const [errors, setErrors] = useState({})

  // Fill the form once the data it depends on has arrived.
  useEffect(() => {
    if (form || !me || (isEdit && !existing.data)) return
    const b = me.business
    if (isEdit) {
      const inv = existing.data
      setForm({
        client_id: inv.client.id, issue_date: inv.issue_date, due_date: inv.due_date, currency: inv.currency, notes: inv.notes || '',
        discount: inv.discount_minor ? fromMinor(inv.discount_minor, inv.currency) : '',
        items: inv.items.map((i) => ({ description: i.description, quantity: String(Number(i.quantity)), price: fromMinor(i.unit_price_minor, inv.currency), tax: String(Number(i.tax_percent)) })),
      })
    } else {
      setForm({ client_id: '', issue_date: today(), due_date: addDays(today(), b.default_due_days), currency: b.currency, notes: b.default_notes || '', discount: '', items: [blankItem(b.default_tax_percent)] })
    }
  }, [form, me, isEdit, existing.data])

  // Live numbers for the preview. Same maths as the server (src/lib/invoiceMath.js).
  const computed = useMemo(() => {
    if (!form) return null
    const lines = form.items.map((i) => ({ quantity: Number(i.quantity) || 0, unitPriceMinor: toMinor(i.price, form.currency), taxPercent: Number(i.tax) || 0 }))
    return { lines, ...calculateTotals(lines, toMinor(form.discount, form.currency)) }
  }, [form])

  const save = useMutation({
    mutationFn: () => {
      const body = {
        client_id: form.client_id, issue_date: form.issue_date, due_date: form.due_date, currency: form.currency,
        notes: form.notes || null, discount_minor: computed.discount,
        items: form.items.map((i, n) => ({ description: i.description.trim(), quantity: i.quantity, unit_price_minor: computed.lines[n].unitPriceMinor, tax_percent: i.tax || '0' })),
      }
      return isEdit ? invoicesApi.update(id, body) : invoicesApi.create(body)
    },
    onSuccess: (inv) => {
      qc.setQueryData(['invoice', inv.id], inv)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['me'] })
      toast(t('invoices.toast.saved'))
      navigate(`/invoices/${inv.id}`)
    },
    onError: (e) => {
      if (e.code === 'plan_limit_reached') setLimitHit(true)
      else toast(e.message, 'error')
    },
  })

  if (!me || !clients || (isEdit && existing.isLoading)) return <Spinner />
  if (existing.error) return <ErrorState error={existing.error} />
  if (!form) return <Spinner />

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setItem = (index, key, value) => setForm((f) => ({ ...f, items: f.items.map((it, n) => (n === index ? { ...it, [key]: value } : it)) }))
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, blankItem(me.business.default_tax_percent)] }))
  const removeItem = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, n) => n !== index) }))

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.client_id) next.client = t('invoices.errors.client')
    if (form.items.some((i) => !i.description.trim() || !(Number(i.quantity) > 0))) next.items = t('invoices.errors.items')
    if (form.due_date < form.issue_date) next.due = t('invoices.errors.dueDate')
    setErrors(next)
    if (Object.keys(next).length === 0) save.mutate()
  }

  const locale = intlLocale(me.business.locale)
  const money = (minor) => formatMoney(minor, form.currency, locale)
  const selectedClient = clients.find((c) => c.id === form.client_id)
  const previewInvoice = {
    number: isEdit ? existing.data.number : `${me.business.invoice_prefix}-${String(me.business.next_invoice_number).padStart(4, '0')}`,
    display_status: isEdit ? existing.data.display_status : 'draft',
    issue_date: form.issue_date, due_date: form.due_date, currency: form.currency, notes: form.notes,
    client: selectedClient || { name: '' },
    items: form.items.map((i, n) => ({ description: i.description, quantity: i.quantity || 0, unit_price_minor: computed.lines[n].unitPriceMinor, tax_percent: i.tax || 0, amount_minor: computed.amounts[n] })),
    subtotal_minor: computed.subtotal, discount_minor: computed.discount, tax_minor: computed.tax, total_minor: computed.total,
  }

  return (
    <>
      <PageHeader title={isEdit ? t('invoices.edit', { number: previewInvoice.number }) : t('invoices.new')} />

      {limitHit && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-900">{t('billing.limitReached')}</p>
          <Button to="/billing" size="sm">{t('billing.upgrade')}</Button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <form onSubmit={submit} className="space-y-5">
          <Card className="space-y-4 p-4 sm:p-5">
            <div>
              <Select label={t('invoices.client')} value={form.client_id} onChange={(e) => (e.target.value === '__new' ? setNewClientOpen(true) : set('client_id', e.target.value))} error={errors.client}>
                <option value="">{t('invoices.selectClient')}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new">+ {t('clients.new')}</option>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input type="date" label={t('invoices.issued')} value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} required />
              <Input type="date" label={t('invoices.due')} value={form.due_date} onChange={(e) => set('due_date', e.target.value)} error={errors.due} required />
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold">{t('invoices.items')}</h2>
            <ul className="space-y-4">
              {form.items.map((item, n) => (
                <li key={n} className="rounded-lg border border-line p-3">
                  <Input aria-label={t('invoices.description')} placeholder={t('invoices.description')} value={item.description} onChange={(e) => setItem(n, 'description', e.target.value)} />
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <Input label={t('invoices.qty')} inputMode="decimal" value={item.quantity} onChange={(e) => setItem(n, 'quantity', e.target.value)} />
                    <Input label={t('invoices.rate')} inputMode="decimal" placeholder="0.00" value={item.price} onChange={(e) => setItem(n, 'price', e.target.value)} />
                    <Input label={`${me.business.tax_label} %`} inputMode="decimal" value={item.tax} onChange={(e) => setItem(n, 'tax', e.target.value)} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-medium">{money(computed.amounts[n])}</span>
                    {form.items.length > 1 && (
                      <Button variant="ghost" size="sm" icon={Trash2} onClick={() => removeItem(n)}>{t('common.remove')}</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {errors.items && <p className="mt-2 text-xs text-red-700">{errors.items}</p>}
            <Button variant="secondary" size="sm" icon={Plus} className="mt-3" onClick={addItem}>{t('invoices.addItem')}</Button>
          </Card>

          <Card className="space-y-4 p-4 sm:p-5">
            <Input label={t('invoices.discountAmount')} inputMode="decimal" placeholder="0.00" value={form.discount} onChange={(e) => set('discount', e.target.value)} className="sm:max-w-xs" />
            <Textarea label={t('invoices.notes')} value={form.notes} onChange={(e) => set('notes', e.target.value)} hint={t('invoices.notesHint')} />
          </Card>

          <Card className="space-y-1.5 p-4 text-sm sm:p-5 xl:hidden">
            <Line label={t('invoices.subtotal')} value={money(computed.subtotal)} />
            {computed.discount > 0 && <Line label={t('invoices.discount')} value={`− ${money(computed.discount)}`} />}
            <Line label={me.business.tax_label} value={money(computed.tax)} />
            <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-semibold"><span>{t('invoices.totalDue')}</span><span>{money(computed.total)}</span></div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
            <Button type="submit" size="lg" loading={save.isPending}>{t('invoices.save')}</Button>
          </div>
        </form>

        {/* Live preview: only on wide screens, where there is room to see it while typing */}
        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <p className="mb-2 text-sm font-medium text-ink-soft">{t('invoices.preview')}</p>
            <InvoicePaper invoice={previewInvoice} business={me.business} locale={locale} />
          </div>
        </aside>
      </div>

      <Modal open={newClientOpen} onClose={() => setNewClientOpen(false)} title={t('clients.new')}>
        <ClientForm onCancel={() => setNewClientOpen(false)} onSaved={(c) => { set('client_id', c.id); setNewClientOpen(false) }} />
      </Modal>
    </>
  )
}

function Line({ label, value }) {
  return <div className="flex justify-between text-ink-soft"><span>{label}</span><span className="text-ink">{value}</span></div>
}
