import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Copy, Download, Files, Pencil, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { invoicesApi } from '@/api'
import { Button, ErrorState, Input, Modal, PageHeader, Spinner, Textarea, useToast } from '@/components/ui'
import { useMe } from '@/features/auth/useMe'
import { intlLocale } from '@/lib/money'
import InvoicePaper from './InvoicePaper'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const [sendOpen, setSendOpen] = useState(false)

  const { data: invoice, isLoading, error, refetch } = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id) })

  const refresh = (updated) => {
    if (updated) qc.setQueryData(['invoice', id], updated)
    qc.invalidateQueries({ queryKey: ['invoices'] })
    qc.invalidateQueries({ queryKey: ['summary'] })
  }
  const onError = (e) => toast(e.message, 'error')

  const setStatus = useMutation({
    mutationFn: (status) => invoicesApi.setStatus(id, status),
    onSuccess: (inv) => { refresh(inv); toast(t(`invoices.toast.${inv.status}`)) },
    onError,
  })
  const duplicate = useMutation({
    mutationFn: () => invoicesApi.duplicate(id),
    onSuccess: (inv) => { refresh(); qc.invalidateQueries({ queryKey: ['me'] }); toast(t('invoices.toast.duplicated')); navigate(`/invoices/${inv.id}`) },
    onError,
  })
  const remove = useMutation({
    mutationFn: () => invoicesApi.remove(id),
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ['me'] }); toast(t('invoices.toast.deleted')); navigate('/invoices') },
    onError,
  })
  const pdf = useMutation({ mutationFn: () => invoicesApi.downloadPdf(id, invoice.number), onError })

  if (isLoading || !me) return <Spinner />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const status = invoice.display_status
  const editable = invoice.status === 'draft' || invoice.status === 'sent'
  const copyLink = async () => {
    await navigator.clipboard.writeText(invoice.share_url)
    toast(t('invoices.toast.linkCopied'))
  }
  const confirmDelete = () => window.confirm(t('invoices.confirmDelete')) && remove.mutate()
  const confirmCancel = () => window.confirm(t('invoices.confirmCancel')) && setStatus.mutate('cancelled')

  return (
    <>
      <PageHeader
        title={invoice.number}
        subtitle={invoice.client.name}
        actions={
          <>
            {invoice.status === 'draft' && <Button icon={Send} onClick={() => setSendOpen(true)}>{t('invoices.send')}</Button>}
            {(status === 'sent' || status === 'overdue') && (
              <Button icon={CheckCircle2} loading={setStatus.isPending} onClick={() => setStatus.mutate('paid')}>{t('invoices.markPaid')}</Button>
            )}
            {status === 'paid' && <Button variant="secondary" onClick={() => setStatus.mutate('sent')}>{t('invoices.markUnpaid')}</Button>}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={Download} loading={pdf.isPending} onClick={() => pdf.mutate()}>{t('invoices.downloadPdf')}</Button>
        {invoice.status !== 'draft' && invoice.status !== 'cancelled' && (
          <>
            <Button variant="secondary" size="sm" icon={Send} onClick={() => setSendOpen(true)}>{t('invoices.sendByEmail')}</Button>
            <Button variant="secondary" size="sm" icon={Copy} onClick={copyLink}>{t('invoices.copyLink')}</Button>
          </>
        )}
        {editable && <Button variant="secondary" size="sm" icon={Pencil} to={`/invoices/${id}/edit`}>{t('common.edit')}</Button>}
        <Button variant="secondary" size="sm" icon={Files} loading={duplicate.isPending} onClick={() => duplicate.mutate()}>{t('invoices.duplicate')}</Button>
        {invoice.status === 'draft' && <Button variant="danger" size="sm" icon={Trash2} onClick={confirmDelete}>{t('common.delete')}</Button>}
        {invoice.status === 'sent' && <Button variant="danger" size="sm" onClick={confirmCancel}>{t('invoices.cancelInvoice')}</Button>}
      </div>

      <InvoicePaper invoice={invoice} business={me.business} locale={intlLocale(me.business.locale)} showBranding={me.billing.plan !== 'pro'} />

      <SendModal open={sendOpen} onClose={() => setSendOpen(false)} invoice={invoice} onSent={(inv) => { refresh(inv); toast(t('invoices.toast.sent')) }} />
    </>
  )
}

function SendModal({ open, onClose, invoice, onSent }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [to, setTo] = useState(invoice.client.email || '')
  const [message, setMessage] = useState('')
  const send = useMutation({
    mutationFn: () => invoicesApi.send(invoice.id, { to: to || null, message: message || null }),
    onSuccess: (inv) => { onSent(inv); onClose() },
    onError: (e) => toast(e.message, 'error'),
  })
  return (
    <Modal open={open} onClose={onClose} title={t('invoices.sendTitle', { number: invoice.number })}>
      <div className="space-y-4">
        <Input type="email" label={t('invoices.sendTo')} value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" />
        <Textarea label={t('invoices.sendMessage')} value={message} onChange={(e) => setMessage(e.target.value)} hint={t('invoices.sendHint')} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button icon={Send} loading={send.isPending} disabled={!to} onClick={() => send.mutate()}>{t('invoices.send')}</Button>
        </div>
      </div>
    </Modal>
  )
}
