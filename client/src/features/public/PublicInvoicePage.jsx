import { useMutation, useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { publicApi } from '@/api'
import BrandMark from '@/components/BrandMark'
import { Button, Spinner, useToast } from '@/components/ui'
import InvoicePaper from '@/features/invoices/InvoicePaper'
import { intlLocale } from '@/lib/money'

/** What your CLIENT sees at /i/<token>. No login. */
export default function PublicInvoicePage() {
  const { token } = useParams()
  const { t } = useTranslation()
  const toast = useToast()
  const { data, isLoading, error } = useQuery({ queryKey: ['public', token], queryFn: () => publicApi.invoice(token), retry: false })
  const pdf = useMutation({ mutationFn: () => publicApi.downloadPdf(token, data.invoice.number), onError: (e) => toast(e.message, 'error') })

  if (isLoading) return <Spinner />
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-2xl font-semibold">{t('public.invalidTitle')}</h1>
        <p className="text-ink-soft">{t('public.invalidText')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">{t('public.from', { name: data.business.name })}</p>
          <Button variant="secondary" size="sm" icon={Download} loading={pdf.isPending} onClick={() => pdf.mutate()}>{t('invoices.downloadPdf')}</Button>
        </div>
        <InvoicePaper invoice={data.invoice} business={data.business} locale={intlLocale(data.business.locale)} showBranding={data.show_branding} />
        {data.show_branding && (
          <div className="mt-6 flex justify-center opacity-80"><BrandMark size={24} /></div>
        )}
      </div>
    </div>
  )
}
