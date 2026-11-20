import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clientsApi } from '@/api'
import { Button, Input, Textarea, useToast } from '@/components/ui'
import { fieldErrors } from '@/lib/forms'

const EMPTY = { name: '', email: '', phone: '', tax_id: '', address: '', city: '', state: '', postal_code: '', country: 'IN' }

/** Create or edit a client. Used on the Clients page and inside the invoice editor. */
export default function ClientForm({ client, onSaved, onCancel }) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY, ...Object.fromEntries(Object.entries(client || {}).map(([k, v]) => [k, v ?? ''])) })
  const [errors, setErrors] = useState({})
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, email: form.email || null }
      return client?.id ? clientsApi.update(client.id, body) : clientsApi.create(body)
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast(t('clients.saved'))
      onSaved?.(saved)
    },
    onError: (e) => {
      setErrors(fieldErrors(e))
      toast(e.message, 'error')
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-4">
      <Input label={t('clients.name')} value={form.name} onChange={set('name')} error={errors.name} required autoFocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="email" label={t('clients.email')} value={form.email} onChange={set('email')} error={errors.email} />
        <Input type="tel" label={t('clients.phone')} value={form.phone} onChange={set('phone')} error={errors.phone} />
      </div>
      <Input label={t('clients.taxId')} value={form.tax_id} onChange={set('tax_id')} hint={t('clients.taxIdHint')} />
      <Textarea label={t('clients.address')} value={form.address} onChange={set('address')} rows={2} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label={t('clients.city')} value={form.city} onChange={set('city')} />
        <Input label={t('clients.state')} value={form.state} onChange={set('state')} />
        <Input label={t('clients.postalCode')} value={form.postal_code} onChange={set('postal_code')} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>}
        <Button type="submit" loading={save.isPending}>{t('common.save')}</Button>
      </div>
    </form>
  )
}
